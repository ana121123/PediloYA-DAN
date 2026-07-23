package com.seminario.ms_pago.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import com.seminario.ms_pago.client.PedidoClient;
import com.seminario.ms_pago.dto.PedidoResponseDTO;
import com.seminario.ms_pago.dto.eventos_kafka.PagoConfirmadoEvent;
import com.seminario.ms_pago.kafka.producers.KafkaEventProducer;
import com.seminario.ms_pago.model.EstadoTransaccion;
import com.seminario.ms_pago.model.MetodoPago;
import com.seminario.ms_pago.model.Pago;
import com.seminario.ms_pago.repository.PagoRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class PagoService {
    private final PagoRepository pagoRepository;
    private final PedidoClient pedidoClient;
    private final KafkaEventProducer kafkaEventProducer;

    public Map<String, String> crearPreferencia(String pedidoId) {
        try {
            List<Pago> pagosPendientes = pagoRepository.findByPedidoIdAndEstadoOrderByFechaCreacionAsc(pedidoId, EstadoTransaccion.PENDIENTE);
            
            if (!pagosPendientes.isEmpty()) {
                Pago pagoPendiente = pagosPendientes.get(0);
                log.warn("Ya existe una transacción PENDIENTE para el pedido {}. Preferencia ID: {}", pedidoId, pagoPendiente.getPreferenciaId());
                return Map.of(
                    "preferenceId", pagoPendiente.getPreferenciaId(),
                    "url", "https://www.mercadopago.com.ar/checkout/v1/redirect?preference-id=" + pagoPendiente.getPreferenciaId()
                );
            }

            PedidoResponseDTO pedido = pedidoClient.obtenerPedidoPorId(pedidoId);

            PreferenceClient client = new PreferenceClient();

            List<PreferenceItemRequest> items = new ArrayList<>();

            items.add(PreferenceItemRequest.builder()
                .title("Pedido #" + pedido.getId())
                .quantity(1)
                .unitPrice(pedido.getMontoTotal()) 
                .currencyId("ARS")
                .build());

            PreferenceRequest request = PreferenceRequest.builder()
                .items(items)
                .externalReference(pedidoId)
                .notificationUrl("https://aspen-vicious-neda.ngrok-free.dev/pagoMs/api/pagos/webhook")
                .backUrls(PreferenceBackUrlsRequest.builder()
                        .success("https://aspen-vicious-neda.ngrok-free.dev/cliente/proceso-pedido/paso5") 
                        .pending("https://aspen-vicious-neda.ngrok-free.dev/cliente/proceso-pedido/paso5")
                        .failure("https://aspen-vicious-neda.ngrok-free.dev/cliente/proceso-pedido/paso5")
                        .build())
                .autoReturn("approved") 
                .build();

            Preference preference = client.create(request);

            Pago pago = new Pago();
            pago.setPedidoId(pedidoId);
            pago.setPreferenciaId(preference.getId());
            pago.setMonto(pedido.getMontoTotal()); 
            pago.setEstado(EstadoTransaccion.PENDIENTE); 
            pago.setFechaCreacion(LocalDateTime.now());
            
            pagoRepository.save(pago);

            return Map.of(
                    "preferenceId", preference.getId(),
                    "url", preference.getInitPoint()
                );

        } catch (MPApiException e) {
            System.out.println("Status: " + e.getStatusCode());
            System.out.println("Response: " + e.getApiResponse().getContent()); 
            throw new RuntimeException("Error en MP: " + e.getApiResponse().getContent());
        } catch (MPException e) {
            e.printStackTrace();
            throw new RuntimeException("Error de conexión: " + e.getMessage());
        }
    }

    @Transactional
    public void procesarNotificacionPago(String paymentId) {
        try {
            PaymentClient client = new PaymentClient();
            Payment payment = client.get(Long.parseLong(paymentId));
            String pedidoId = payment.getExternalReference();
            String mpStatus = payment.getStatus();

            // 1. Buscamos registros previos para este pedido
            List<Pago> pagosPrevios = pagoRepository.findAllByPedidoIdOrderByFechaCreacionDesc(pedidoId);
            
            // Intentamos recuperar el preferenciaId de lo que ya tenemos guardado
            String preferenciaIdGuardada = null;
            if (!pagosPrevios.isEmpty()) {
                preferenciaIdGuardada = pagosPrevios.get(0).getPreferenciaId();
            }

            // 2. Buscamos si este intento de pago (paymentId) ya existe
            Optional<Pago> pagoExistentePorMP = pagoRepository.findByIdMP(paymentId);
            Pago pago;

            if (pagoExistentePorMP.isPresent()) {
                pago = pagoExistentePorMP.get();
                if (EstadoTransaccion.APROBADO.equals(pago.getEstado()) && "approved".equals(mpStatus)) {
                    log.info("Pago {} ya estaba APROBADO. Se ignora webhook duplicado.", paymentId);
                    return;
                }
            } else {
                // Si es un reintento o el primer aviso, creamos un registro
                pago = new Pago();
                pago.setPedidoId(pedidoId);
                pago.setFechaCreacion(LocalDateTime.now());
                // REUTILIZAMOS el ID de preferencia que recuperamos arriba
                pago.setPreferenciaId(preferenciaIdGuardada); 
            }

            // 3. Seteamos los datos que SÍ funcionan en todas las versiones de la SDK
            pago.setIdMP(paymentId);
            pago.setEstado(mapearEstado(mpStatus));
            pago.setMonto(payment.getTransactionAmount());
            
            if (payment.getDateApproved() != null) {
                pago.setFechaAprobacion(payment.getDateApproved().toLocalDateTime());
            }
            
            pago.setMetodoDePago(mapearMetodo(payment.getPaymentTypeId()));

            pagoRepository.save(pago);

            // 4. Si el pago actual es el aprobado, confirmar pedido
            if ("approved".equals(mpStatus)) {
                //pedidoClient.confirmarPago(pedidoId);
                //log.info("¡ÉXITO! Pedido {} pagado con ID MP: {}", pedidoId, paymentId);

                PagoConfirmadoEvent event = PagoConfirmadoEvent.builder()
                    .pedidoId(pedidoId)
                    .transactionId(paymentId)
                    .correlationId("PAY-" + paymentId)
                    .build();

                kafkaEventProducer.publishEvent("pago-confirmado", event, pedidoId);
                log.info("Pago aprobado publicado en Kafka | Pedido: {} | ID MP: {}", pedidoId, paymentId);
            }

        } catch (Exception e) {
            log.error("Error procesando pago {}: {}", paymentId, e.getMessage());
        }
    }

    private MetodoPago mapearMetodo(String mpType) {
        return switch (mpType) {
            case "credit_card" -> MetodoPago.TARJETA_CREDITO;
            case "debit_card" -> MetodoPago.TARJETA_DEBITO;
            default -> MetodoPago.DINERO_CUENTA;
        };
    }

    public Map<String, Object> obtenerEstadoPago(String pedidoId) {
        List<Pago> pagos = pagoRepository.findAllByPedidoIdOrderByFechaCreacionDesc(pedidoId);
        
        if (pagos.isEmpty()) {
            return Map.of(
                "estado", "SIN_PAGO",
                "mensaje", "No hay transacción registrada para este pedido"
            );
        }

        Pago pago = pagos.get(0);
        return Map.of(
            "estado", pago.getEstado().toString(),
            "idMP", pago.getIdMP() != null ? pago.getIdMP() : "",
            "monto", pago.getMonto(),
            "metodoDePago", pago.getMetodoDePago() != null ? pago.getMetodoDePago().toString() : "",
            "fechaCreacion", pago.getFechaCreacion().toString(),
            "fechaAprobacion", pago.getFechaAprobacion() != null ? pago.getFechaAprobacion().toString() : ""
        );
    }

    private EstadoTransaccion mapearEstado(String mpStatus) {
        return switch (mpStatus) {
            case "approved" -> EstadoTransaccion.APROBADO;
            case "rejected" -> EstadoTransaccion.RECHAZADO; // Asegúrate de tener este en tu Enum
            case "cancelled" -> EstadoTransaccion.CANCELADO;
            default -> EstadoTransaccion.PENDIENTE;
        };
}
}
