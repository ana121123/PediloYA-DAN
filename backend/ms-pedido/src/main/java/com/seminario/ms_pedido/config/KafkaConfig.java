package com.seminario.ms_pedido.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.listener.ConsumerAwareListenerErrorHandler;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import com.seminario.ms_pedido.dto.eventos_kafka.CambiarEstadoPedidoEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.CheckoutIniadoEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.EnvioAConfirmarEvent;
import com.seminario.ms_pedido.dto.eventos_kafka.PagoConfirmadoEvent;

import lombok.extern.slf4j.Slf4j;

/**
 * Configuración centralizada de Kafka para ms-pedido
 * 
 * Define:
 * - ProducerFactory: Para publicar eventos
 * - ConsumerFactory: Para consumir eventos
 * - Serialización JSON para events DTOs
 * - Manejo robusto de errores
 * - Configuración de concurrencia y ACKs
 */
@Slf4j
@EnableKafka
@EnableRetry
@Configuration
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id:ms-pedido-group}")
    private String consumerGroupId;

    @Value("${spring.kafka.consumer.auto-offset-reset:earliest}")
    private String autoOffsetReset;

    @Value("${spring.kafka.consumer.max-poll-records:100}")
    private Integer maxPollRecords;

    @Value("${spring.kafka.listener.concurrency:3}")
    private Integer concurrency;

    // ============ PRODUCER CONFIGURATION ============

    /**
     * ProducerFactory: Configura cómo se envían mensajes a Kafka
     * - Serialización: JSON para eventos complejos
     * - Idempotencia: Evita duplicados si hay reintentos
     * - Acks: "all" para garantizar entrega a todos los replicas
     */
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        
        // === Broker Configuration ===
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        
        // === Serialización ===
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        
        // === Garantías de Entrega ===
        configProps.put(ProducerConfig.ACKS_CONFIG, "all");      // Espera confirmación de todos los replicas
        configProps.put(ProducerConfig.RETRIES_CONFIG, 3);       // Reintentar hasta 3 veces
        configProps.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1);  // Orden garantizado
        
        // === Idempotencia ===
        configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);  // No duplica mensajes
        
        // === Batching para mejor rendimiento ===
        configProps.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);    // 16KB
        configProps.put(ProducerConfig.LINGER_MS_CONFIG, 10);        // Espera 10ms para agrupar
        
        // === Timeouts ===
        configProps.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    /**
     * KafkaTemplate: Interfaz simplificada para publicar eventos
     * Soporta tanto String como Object (DTOs)
     */
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate(ProducerFactory<String, Object> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    // ============ CONSUMER CONFIGURATION ============

    /**
     * ConsumerFactory: Configura cómo se consumen mensajes desde Kafka
     * - Desserialización: JSON para eventos complejos
     * - Offset: "earliest" para reprocessar si es necesario
     * - Batching: Procesa múltiples mensajes
     */
    private <T> ConsumerFactory<String, T> consumerFactory(Class<T> eventType) {
        Map<String, Object> props = new HashMap<>();
        
        // === Broker Configuration ===
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, consumerGroupId);
        
        // === Deserialización ===
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());
        
        // === JSON Configuration ===
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, eventType.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");  // Permitir todos los packages
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        
        // === Offset & Polling ===
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, autoOffsetReset);
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);  // Commit manual para mejor control
        props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 1000);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, maxPollRecords);
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);  // 5 minutos
        
        // === Session & Heartbeat ===
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);    // 30 segundos
        props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10000); // 10 segundos
        
        return new DefaultKafkaConsumerFactory<>(props);
    }

    /**
     * ConcurrentKafkaListenerContainerFactory: Contenedor para @KafkaListener
     * 
     * Configuración:
     * - Concurrency: Procesa múltiples particiones en paralelo
     * - AckMode: MANUAL para confirmar solo después de procesar
     * - ErrorHandler: Manejo robusto de excepciones
     */
    private <T> ConcurrentKafkaListenerContainerFactory<String, T> kafkaListenerContainerFactory(
            ConsumerFactory<String, T> consumerFactory) {

        ConcurrentKafkaListenerContainerFactory<String, T> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        
        // === Consumer & Concurrency ===
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(concurrency);  // Procesa N tópics en paralelo
        
        // === Acknowledgment ===
        factory.getContainerProperties().setAckMode(
            org.springframework.kafka.listener.ContainerProperties.AckMode.MANUAL
        );
        
        // === Error Handler ===
        factory.setCommonErrorHandler(kafkaErrorHandler());
        
        // === Batch Processing ===
        factory.setBatchListener(false);  // Procesa mensaje a mensaje (no en lotes)
        
        return factory;
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, CheckoutIniadoEvent> checkoutIniciadoKafkaListenerContainerFactory() {
        return kafkaListenerContainerFactory(consumerFactory(CheckoutIniadoEvent.class));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, EnvioAConfirmarEvent> envioAConfirmarKafkaListenerContainerFactory() {
        return kafkaListenerContainerFactory(consumerFactory(EnvioAConfirmarEvent.class));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, PagoConfirmadoEvent> pagoConfirmadoKafkaListenerContainerFactory() {
        return kafkaListenerContainerFactory(consumerFactory(PagoConfirmadoEvent.class));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, CambiarEstadoPedidoEvent> cambiarEstadoPedidoKafkaListenerContainerFactory() {
        return kafkaListenerContainerFactory(consumerFactory(CambiarEstadoPedidoEvent.class));
    }

    /**
     * Error Handler: Maneja excepciones en listeners
     * 
     * Estrategia:
     * - Log del error con contexto
     * - No reintentar automáticamente (usa @Retry en el listener)
     * - Permitir que el listener decida qué hacer
     */
    @Bean
    public org.springframework.kafka.listener.CommonErrorHandler kafkaErrorHandler() {
        return new org.springframework.kafka.listener.DefaultErrorHandler((record, ex) -> {
            log.error(
                "Error irrecuperable procesando mensaje | Topic: {} | Partition: {} | Offset: {} | Error: {}",
                record.topic(),
                record.partition(),
                record.offset(),
                ex.getMessage(),
                ex
            );
        });
    }

    /**
     * Error Handler para use dentro de listeners (si no está usando DefaultErrorHandler)
     * Puede ser inyectado en listeners con @Bean
     */
    @Bean
    public ConsumerAwareListenerErrorHandler consumerAwareListenerErrorHandler() {
        return (message, exception, consumer) -> {
            log.error(
                "Error en listener de Kafka | Topic: {} | Message: {} | Error: {}",
                message.getHeaders().get(KafkaHeaders.RECEIVED_TOPIC),
                message.getPayload(),
                exception.getMessage(),
                exception
            );
            return null;
        };
    }

    // ============ CONFIGURATION SUMMARY ============
    /*
     * RESUMEN DE CONFIGURACIÓN:
     * 
     * PRODUCER:
     * - Acks: all (garantía total)
     * - Idempotencia: activada (sin duplicados)
     * - Retries: 3 veces
     * - Serialización: JSON
     * 
     * CONSUMER:
     * - Offset Reset: earliest (reprocessar si falta)
     * - Commit: manual (solo después de procesar)
     * - Concurrency: 3 threads
     * - Desserialización: JSON con ErrorHandling
     * 
     * VENTAJAS:
     * ✓ Garantía de entrega (at-least-once)
     * ✓ Prevención de duplicados (idempotencia)
     * ✓ Procesamiento robusto con retry
     * ✓ Escalabilidad horizontal (threads)
     * ✓ Error handling centralizado
     */
}
