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
 * Evento: ms-pago confirma que el pago fue exitoso
 * Reemplaza: PATCH /pedidos/{id}/confirmar-pago (webhook del ms-pago)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagoConfirmadoEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String pedidoId;             // ID del pedido pagado
    private String transactionId;        // ID de la transacción en pago
    private String correlationId;        // Para tracing
}

