package com.seminario.ms_pedido.dto.eventos_kafka;

import java.io.Serializable;

import com.seminario.ms_pedido.dto.PedidoResponseDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ========== EVENTOS DE SALIDA (ms-pedido PUBLICA) ==========
 * Estos DTOs representan eventos que ms-pedido publica
 * para que otros microservicios los consuman
 */
/**
 * Evento: Estado del pedido fue actualizado
 * Respuesta de: CambiarEstadoPedidoEvent
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadoPedidoActualizadoEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private PedidoResponseDTO pedido;    // Los mismos datos del response HTTP
    private String correlationId;        // Para tracing
    private Long timestamp;              // Epoch milliseconds
}

