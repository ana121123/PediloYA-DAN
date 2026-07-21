#!/bin/bash

# Inicializa los topics de Kafka para el entorno local del proyecto.
# Este script se debe ejecutar despues de que el broker kafka-broker-1 este disponible.

KAFKA_BOOTSTRAP_SERVER="kafka-broker-1:9092"

kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create --topic pedido-creado --partitions 1 --replication-factor 1
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create --topic pago-confirmado --partitions 1 --replication-factor 1
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create --topic pago-rechazado --partitions 1 --replication-factor 1
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create --topic pedido-estado-actualizado --partitions 1 --replication-factor 1
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create --topic producto-actualizado --partitions 1 --replication-factor 1
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create --topic direccion-validada --partitions 1 --replication-factor 1
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create --topic notificacion-pedido --partitions 1 --replication-factor 1
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create --topic notificacion-usuario --partitions 1 --replication-factor 1

kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --list
