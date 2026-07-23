package com.seminario.ms_pedido.kafka.listeners;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import com.seminario.ms_pedido.dto.PedidoResponseDTO;
import com.seminario.ms_pedido.dto.eventos_kafka.CambiarEstadoPedidoEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.CheckoutIniadoEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.EnvioAConfirmarEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.EnvioConfirmadoEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.EstadoPedidoActualizadoEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.PagoProcesadoEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.PagoConfirmadoEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.PedidoCreadoEvent;
import com.seminario.ms_pedido.kafka.producers.KafkaEventProducer;
import com.seminario.ms_pedido.service.PedidoService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

/**
 * ========== KAFKA LISTENERS PARA PEDIDOS ==========
 * 
 * Este archivo reemplaza los siguientes endpoints HTTP que ahora son asincronicos via Kafka:
 * 
 * ❌ POST   /pedidos/iniciar-checkout/{vendedorId}        → ✓ Escucha "checkout-iniciado"
 * ❌ PATCH  /pedidos/confirmar-envio                       → ✓ Escucha "envio-a-confirmar"
 * ❌ PATCH  /pedidos/{id}/confirmar-pago (webhook)         → ✓ Escucha "pago-confirmado"
 * ❌ PATCH  /pedidos/{id}/estado                           → ✓ Escucha "cambiar-estado-pedido"
 * 
 * Los endpoints HTTP siguen existiendo pero están COMENTADOS en PedidoController.
 * 
 * FLUJO:
 * 1. Cliente/UI publica evento en Kafka (ej: "checkout-iniciado")
 * 2. Este listener escucha el evento
 * 3. Ejecuta la lógica del service (mismo código del endpoint)
 * 4. Si hay response, publica un evento de salida (ej: "pedido-creado")
 * 5. El cliente/UI escucha ese evento para actualizar su estado
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PedidoKafkaListener {

    private final PedidoService pedidoService;
    private final KafkaEventProducer kafkaProducer;

    // ============================================================
    // LISTENER 1: INICIAR CHECKOUT (Reemplaza POST /iniciar-checkout/{vendedorId})
    // ============================================================

    /**
     * Escucha: "checkout-iniciado"
     * 
     * Evento de entrada: CheckoutIniadoEvent
     *   - vendedorId: A qué vendedor corresponde
     *   - usuarioId: Email del cliente
     *   - correlationId: Para tracing
     * 
     * Lógica: Crea un borrador de pedido con los items del carrito
     * 
     * Respuesta: Publica "pedido-creado" con PedidoResponseDTO
     */
    @KafkaListener(
        groupId = "ms-pedido-checkout-group",
        topics = "checkout-iniciado",
        containerFactory = "checkoutIniciadoKafkaListenerContainerFactory",
        concurrency = "2"  // 2 threads en paralelo
    )
    @Retryable(
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0)  // 2s, 4s, 8s
    )
    public void handleCheckoutIniciado(
            @Payload CheckoutIniadoEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        String eventId = generateEventId();
        log.info(
            "[{}] ➤ Iniciando checkout | VendedorId: {} | Cliente: {} | Topic: {} | Partition: {} | Offset: {}",
            eventId, event.getVendedorId(), event.getUsuarioId(), topic, partition, offset
        );

        try {
            // === CREAR AUTHENTICATION (simular contexto de seguridad) ===
            Authentication auth = new UsernamePasswordAuthenticationToken(
                event.getUsuarioId(),  // email del cliente
                null,
                null
            );

            // === EJECUTAR LÓGICA DEL SERVICE (mismo código que antes) ===
            PedidoResponseDTO pedidoCreado = pedidoService.crearBorradorPedido(
                event.getVendedorId(),
                auth
            );

            log.info("[{}] ✓ Pedido creado exitosamente | PedidoId: {}", eventId, pedidoCreado.getId());

            // === PUBLICAR EVENTO DE RESPUESTA ===
            PedidoCreadoEvent responseEvent = PedidoCreadoEvent.builder()
                .pedido(pedidoCreado)
                .correlationId(event.getCorrelationId())
                .timestamp(System.currentTimeMillis())
                .build();

            kafkaProducer.publishEvent("pedido-creado", responseEvent, pedidoCreado.getId());

            // === CONFIRMAR OFFSET (commit manual) ===
            acknowledgment.acknowledge();
            log.info("[{}] ✓ Evento procesado y confirmado", eventId);

        } catch (Exception e) {
            log.error(
                "[{}] ✗ Error en handleCheckoutIniciado | VendedorId: {} | Error: {}",
                eventId, event.getVendedorId(), e.getMessage(), e
            );
            // @Retry se encarga de reintentar
            throw new RuntimeException("Error procesando checkout", e);
        }
    }

    // ============================================================
    // LISTENER 2: CONFIRMAR ENVÍO (Reemplaza PATCH /confirmar-envio)
    // ============================================================

    /**
     * Escucha: "envio-a-confirmar"
     * 
     * Evento de entrada: EnvioAConfirmarEvent
     *   - usuarioId: Email del cliente
     *   - vendedorId: ID del vendedor
     *   - envio: ConfirmarEnvioRequestDTO (dirección, método, etc)
     * 
     * Lógica: Actualiza el pedido con dirección y costo de envío
     * 
     * Respuesta: Publica "envio-confirmado" con PedidoResponseDTO
     */
    @KafkaListener(
        groupId = "ms-pedido-envio-group",
        topics = "envio-a-confirmar",
        containerFactory = "envioAConfirmarKafkaListenerContainerFactory",
        concurrency = "2"
    )
    @Retryable(
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0)
    )
    public void handleEnvioAConfirmar(
            @Payload EnvioAConfirmarEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        String eventId = generateEventId();
        log.info(
            "[{}] ➤ Confirmando envío | VendedorId: {} | Cliente: {} | Topic: {} | Partition: {} | Offset: {}",
            eventId, event.getVendedorId(), event.getUsuarioId(), topic, partition, offset
        );

        try {
            // === CREAR AUTHENTICATION ===
            Authentication auth = new UsernamePasswordAuthenticationToken(
                event.getUsuarioId(),  // email del cliente
                null,
                null
            );

            // === EJECUTAR LÓGICA DEL SERVICE ===
            PedidoResponseDTO pedidoConfirmado = pedidoService.confirmarOActualizarEnvio(
                event.getEnvio(),
                auth
            );

            log.info("[{}] ✓ Envío confirmado exitosamente | PedidoId: {}", eventId, pedidoConfirmado.getId());

            // === PUBLICAR EVENTO DE RESPUESTA ===
            EnvioConfirmadoEvent responseEvent = EnvioConfirmadoEvent.builder()
                .pedido(pedidoConfirmado)
                .correlationId(event.getCorrelationId())
                .timestamp(System.currentTimeMillis())
                .build();

            kafkaProducer.publishEvent("envio-confirmado", responseEvent, pedidoConfirmado.getId());

            // === CONFIRMAR OFFSET ===
            acknowledgment.acknowledge();
            log.info("[{}] ✓ Evento procesado y confirmado", eventId);

        } catch (Exception e) {
            log.error(
                "[{}] ✗ Error en handleEnvioAConfirmar | VendedorId: {} | Error: {}",
                eventId, event.getVendedorId(), e.getMessage(), e
            );
            throw new RuntimeException("Error confirmando envío", e);
        }
    }

    // ============================================================
    // LISTENER 3: CONFIRMAR PAGO (Reemplaza PATCH /confirmar-pago webhook)
    // ============================================================

    /**
     * Escucha: "pago-confirmado"
     * 
     * Evento de entrada: PagoConfirmadoEvent
     *   - pedidoId: ID del pedido pagado
     *   - transactionId: ID de la transacción
     * 
     * Lógica: Marca el pedido como REALIZADO
     *         Notifica al vendedor
     *         Limpia el carrito del cliente
     * 
     * Respuesta: Publica "pago-procesado" para notificar a otros servicios
     *           (NO usa el mismo DTO porque marcarComoPagado() retorna void)
     */
    @KafkaListener(
        groupId = "ms-pedido-pago-group",
        topics = "pago-confirmado",
        containerFactory = "pagoConfirmadoKafkaListenerContainerFactory",
        concurrency = "2"
    )
    @Retryable(
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0)
    )
    public void handlePagoConfirmado(
            @Payload PagoConfirmadoEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        String eventId = generateEventId();
        log.info(
            "[{}] ➤ Confirmando pago | PedidoId: {} | TransactionId: {} | Topic: {} | Partition: {} | Offset: {}",
            eventId, event.getPedidoId(), event.getTransactionId(), topic, partition, offset
        );

        try {
            // === EJECUTAR LÓGICA DEL SERVICE ===
            // Nota: marcarComoPagado() retorna void, así que solo ejecutamos
            pedidoService.marcarComoPagado(event.getPedidoId());

            log.info("[{}] ✓ Pago confirmado exitosamente | PedidoId: {}", eventId, event.getPedidoId());

            // === PUBLICAR EVENTO DE NOTIFICACIÓN ===
            // Para que otros servicios sepan que el pedido fue pagado
            PagoProcesadoEvent notificationEvent = PagoProcesadoEvent.builder()
                .pedidoId(event.getPedidoId())
                .correlationId(event.getCorrelationId())
                .timestamp(System.currentTimeMillis())
                .build();

            kafkaProducer.publishEvent("pago-procesado", notificationEvent, event.getPedidoId());

            // === CONFIRMAR OFFSET ===
            acknowledgment.acknowledge();
            log.info("[{}] ✓ Evento procesado y confirmado", eventId);

        } catch (Exception e) {
            log.error(
                "[{}] ✗ Error en handlePagoConfirmado | PedidoId: {} | Error: {}",
                eventId, event.getPedidoId(), e.getMessage(), e
            );
            throw new RuntimeException("Error procesando pago confirmado", e);
        }
    }

    // ============================================================
    // LISTENER 4: CAMBIAR ESTADO PEDIDO (Reemplaza PATCH /{id}/estado)
    // ============================================================

    /**
     * Escucha: "cambiar-estado-pedido"
     * 
     * Evento de entrada: CambiarEstadoPedidoEvent
     *   - pedidoId: ID del pedido
     *   - nuevoEstado: Nuevo estado (EN_PREPARACION, ENTREGADO, etc)
     *   - usuarioId: Email del vendedor (autorización)
     * 
     * Lógica: Actualiza el estado del pedido
     *         Notifica al cliente del cambio
     * 
     * Respuesta: Publica "estado-pedido-actualizado" con PedidoResponseDTO
     */
    @KafkaListener(
        groupId = "ms-pedido-estado-group",
        topics = "cambiar-estado-pedido",
        containerFactory = "cambiarEstadoPedidoKafkaListenerContainerFactory",
        concurrency = "2"
    )
    @Retryable(
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0)
    )
    public void handleCambiarEstadoPedido(
            @Payload CambiarEstadoPedidoEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        String eventId = generateEventId();
        log.info(
            "[{}] ➤ Cambiando estado | PedidoId: {} | NuevoEstado: {} | Vendedor: {} | Topic: {} | Partition: {} | Offset: {}",
            eventId, event.getPedidoId(), event.getNuevoEstado(), event.getUsuarioId(), topic, partition, offset
        );

        try {
            // === CREAR AUTHENTICATION (como si fuera el vendedor logueado) ===
            Authentication auth = new UsernamePasswordAuthenticationToken(
                event.getUsuarioId(),  // email del vendedor
                null,
                null
            );

            // === EJECUTAR LÓGICA DEL SERVICE ===
            PedidoResponseDTO pedidoActualizado = pedidoService.actualizarEstado(
                event.getPedidoId(),
                event.getNuevoEstado(),
                auth
            );

            log.info(
                "[{}] ✓ Estado actualizado exitosamente | PedidoId: {} | NuevoEstado: {}",
                eventId, event.getPedidoId(), pedidoActualizado.getEstado()
            );

            // === PUBLICAR EVENTO DE RESPUESTA ===
            EstadoPedidoActualizadoEvent responseEvent = EstadoPedidoActualizadoEvent.builder()
                .pedido(pedidoActualizado)
                .correlationId(event.getCorrelationId())
                .timestamp(System.currentTimeMillis())
                .build();

            kafkaProducer.publishEvent("estado-pedido-actualizado", responseEvent, event.getPedidoId());

            // === CONFIRMAR OFFSET ===
            acknowledgment.acknowledge();
            log.info("[{}] ✓ Evento procesado y confirmado", eventId);

        } catch (Exception e) {
            log.error(
                "[{}] ✗ Error en handleCambiarEstadoPedido | PedidoId: {} | Error: {}",
                eventId, event.getPedidoId(), e.getMessage(), e
            );
            throw new RuntimeException("Error cambiando estado del pedido", e);
        }
    }

    // ============================================================
    // UTILITIES
    // ============================================================

    /**
     * Genera un ID único para tracing de eventos
     */
    private String generateEventId() {
        return "EVT-" + System.nanoTime() % 10000;
    }
}
