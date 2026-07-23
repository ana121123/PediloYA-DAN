#!/bin/bash

# Script de inicialización de Topics Kafka para MS-Pedido
# Contiene solo los topics necesarios para reemplazar:
# 1. iniciar-checkout (POST)
# 2. confirmar-envio (PATCH)
# 3. confirmar-pago (PATCH)
# 4. cambiar estado (PATCH)

KAFKA_BOOTSTRAP_SERVER="kafka-broker-1:9092"

echo "========================================="
echo "Creando topics para MS-Pedido"
echo "========================================="

# === TOPICS DE ENTRADA (que ms-pedido ESCUCHA) ===

echo "▸ Creando topic: checkout-iniciado"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic checkout-iniciado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=604800000

echo "▸ Creando topic: envio-a-confirmar"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic envio-a-confirmar \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=604800000

echo "▸ Creando topic: pago-confirmado"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic pago-confirmado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=2592000000

echo "▸ Creando topic: cambiar-estado-pedido"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic cambiar-estado-pedido \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=604800000

# === TOPICS DE SALIDA (que ms-pedido PUBLICA) ===

echo "▸ Creando topic: pedido-creado"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic pedido-creado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=604800000

echo "▸ Creando topic: envio-confirmado"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic envio-confirmado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=604800000

echo "▸ Creando topic: estado-pedido-actualizado"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic estado-pedido-actualizado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=604800000

echo ""
echo "========================================="
echo "✓ Topics creados exitosamente"
echo "========================================="
echo ""

# Listar topics para verificación
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --list