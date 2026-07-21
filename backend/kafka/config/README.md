# Kafka Configuration Directory

Esta carpeta contiene los scripts de configuración de Kafka usados en el entorno local.

Archivos:
  - scripts/init-topics.sh: inicializa los topics necesarios para los eventos del proyecto.

Uso:
  1. Asegúrate de que Kafka y Zookeeper estén levantados en Docker Compose.
  2. Ejecuta el script con: `docker compose run --rm kafka-init`.

Topics creados:
  - pedido-creado
  - pago-confirmado
  - pago-rechazado
  - pedido-estado-actualizado
  - producto-actualizado
  - direccion-validada
  - notificacion-pedido
  - notificacion-usuario
