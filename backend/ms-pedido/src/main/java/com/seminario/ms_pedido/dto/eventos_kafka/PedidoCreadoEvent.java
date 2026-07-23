package com.seminario.ms_pedido.dto.eventos_kafka;

import com.seminario.ms_pedido.dto.ConfirmarEnvioRequestDTO;
import com.seminario.ms_pedido.dto.PedidoResponseDTO;
import com.seminario.ms_pedido.model.EstadoPedido;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * ========== EVENTOS DE SALIDA (ms-pedido PUBLICA) ==========
 * Estos DTOs representan eventos que ms-pedido publica
 * para que otros microservicios los consuman
 */

/**
 * Evento: Pedido fue creado exitosamente
 * Respuesta de: CheckoutIniadoEvent
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PedidoCreadoEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private PedidoResponseDTO pedido;    // Los mismos datos del response HTTP
    private String correlationId;        // Para tracing
    private Long timestamp;              // Epoch milliseconds
}