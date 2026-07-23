package com.seminario.ms_pedido.kafka.producers;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Servicio para publicar eventos a tópicos de Kafka
 * 
 * Usado por los listeners para publicar eventos de respuesta
 * Ej: CheckoutIniadoEvent → PedidoCreadoEvent
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Publica un evento a un tópico de Kafka
     * 
     * @param topicName    Nombre del tópico (ej: "pedido-creado")
     * @param event        Objeto evento a publicar (se serializa a JSON)
     * @param partitionKey Clave para particionar (ej: pedidoId)
     *                     Todos los eventos del mismo pedido van a la misma partición
     */
    public void publishEvent(String topicName, Object event, String partitionKey) {
        
        try {
            // === CONSTRUIR MENSAJE CON HEADERS ===
            Message<Object> message = MessageBuilder
                .withPayload(event)
                .setHeader(KafkaHeaders.TOPIC, topicName)
                .setHeader(KafkaHeaders.KEY, partitionKey)
                .setHeader("event-timestamp", System.currentTimeMillis())
                .build();

            // === ENVIAR DE FORMA ASINCRÓNICA ===
            kafkaTemplate.send(message).whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error(
                        "Error al publicar evento | Topic: {} | Key: {} | Error: {}",
                        topicName, partitionKey, ex.getMessage(), ex
                    );
                    return;
                }

                log.info(
                    "Evento publicado exitosamente | Topic: {} | Partition: {} | Offset: {} | Key: {}",
                    result.getRecordMetadata().topic(),
                    result.getRecordMetadata().partition(),
                    result.getRecordMetadata().offset(),
                    partitionKey
                );
            });

        } catch (Exception e) {
            log.error(
                "✗ Excepción al construir mensaje | Topic: {} | Error: {}",
                topicName, e.getMessage(), e
            );
        }
    }

    /**
     * Variante simplificada: Publicar sin esperar respuesta
     * 
     * @param topicName Nombre del tópico
     * @param event     Evento a publicar
     * @param key       Partition key
     */
    public void publishEventAsync(String topicName, Object event, String key) {
        publishEvent(topicName, event, key);
    }
}