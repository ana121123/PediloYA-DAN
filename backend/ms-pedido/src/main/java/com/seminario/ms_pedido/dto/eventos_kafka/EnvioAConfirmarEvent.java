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
 * Evento: Cliente confirma la dirección y método de envío
 * Reemplaza: PATCH /pedidos/confirmar-envio
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioAConfirmarEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String usuarioId;            // Email del cliente
    private String vendedorId;           // Vendedor del pedido
    private ConfirmarEnvioRequestDTO envio;  // Datos de envío (dirección, método)
    private String correlationId;        // Para tracing
}

