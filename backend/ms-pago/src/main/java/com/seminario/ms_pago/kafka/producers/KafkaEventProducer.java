package com.seminario.ms_pago.kafka.producers;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishEvent(String topicName, Object event, String partitionKey) {
        kafkaTemplate.send(topicName, partitionKey, event).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error(
                    "Error al publicar evento Kafka | Topic: {} | Key: {} | Error: {}",
                    topicName, partitionKey, ex.getMessage(), ex
                );
                return;
            }

            log.info(
                "Evento Kafka publicado | Topic: {} | Partition: {} | Offset: {} | Key: {}",
                result.getRecordMetadata().topic(),
                result.getRecordMetadata().partition(),
                result.getRecordMetadata().offset(),
                partitionKey
            );
        });
    }
}
