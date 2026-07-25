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


echo "▸ Creando topic: pago-confirmado"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic pago-confirmado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=2592000000


echo "Creando topic: pago-procesado" 
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic pago-procesado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=2592000000

echo "Creando topic: cliente-registrado"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic cliente-registrado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=2592000000

echo "Creando topic: vendedor-registrado"
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --create \
  --if-not-exists \
  --topic vendedor-registrado \
  --partitions 2 \
  --replication-factor 1 \
  --config retention.ms=2592000000

echo ""
echo "========================================="
echo "✓ Topics creados exitosamente"
echo "========================================="
echo ""

# Listar topics para verificación
kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVER" --list
