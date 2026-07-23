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
 * ========== EVENTOS DE ENTRADA (ms-pedido ESCUCHA) ==========
 * Estos DTOs representan eventos que otros microservicios publican
 * y que ms-pedido consume
 */


/**
 * Evento: Vendedor cambia el estado del pedido
 * Reemplaza: PATCH /pedidos/{id}/estado
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CambiarEstadoPedidoEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String pedidoId;             // ID del pedido a actualizar
    private EstadoPedido nuevoEstado;    // Nuevo estado
    private String usuarioId;            // Email del vendedor
    private String correlationId;        // Para tracing
}

