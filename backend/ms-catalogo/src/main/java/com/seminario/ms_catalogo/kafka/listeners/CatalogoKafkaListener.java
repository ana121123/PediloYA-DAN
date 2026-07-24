package com.seminario.ms_catalogo.kafka.listeners;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;

import com.seminario.ms_catalogo.dto.eventos_ms_usuarios.VendedorRegistradoEvent;
import com.seminario.ms_catalogo.service.VendedorService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class CatalogoKafkaListener {
    private final VendedorService vendedorService;
    // ============================================================
    // LISTENER 1: REGISTRAR VENDEDOR (Reemplaza POST /registrar)
    // ============================================================

    /**
     * Escucha: "vendedor-registrado"
     * 
     * Evento de entrada: VendedorRegistradoEvent
     */
    @KafkaListener(
        groupId = "ms-catalogo-vendedor-group",
        topics = "vendedor-registrado",
        containerFactory = "vendedorRegistradoKafkaListenerContainerFactory",
        concurrency = "2"
    )
    @Retryable(
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0)
    )
    public void handleVendedorRegistrado(
            @Payload VendedorRegistradoEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        String eventId = generateEventId();
        log.info(
            "[{}] ➤ Vendedor registrado | VendedorId: {} | Email: {} | Topic: {} | Partition: {} | Offset: {}",
            eventId, event.getUsuarioId(), event.getEmail(), topic, partition, offset
        );

        try {
            // === EJECUTAR LÓGICA DEL SERVICE ===
            vendedorService.recibirRegistroVendedor(event);


            log.info("[{}] ✓ Vendedor registrado exitosamente | Email: {}", eventId, event.getEmail());

            // === CONFIRMAR OFFSET ===
            acknowledgment.acknowledge();
            log.info("[{}] ✓ Evento procesado y confirmado", eventId);

        } catch (Exception e) {
            log.error(
                "[{}] ✗ Error en handleVendedorRegistrado | Email: {} | Error: {}",
                eventId, event.getEmail(), e.getMessage(), e
            );
            throw new RuntimeException("Error procesando vendedor registrado", e);
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
