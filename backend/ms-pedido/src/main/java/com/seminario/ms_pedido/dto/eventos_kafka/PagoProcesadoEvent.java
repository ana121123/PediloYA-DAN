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
 * Evento: Pago fue confirmado (versión simplificada para notificación)
 * Se publica para que otros servicios sepan que el pedido fue pagado
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagoProcesadoEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String pedidoId;
    private String clienteId;
    private String vendedorId;
    private String correlationId;
    private Long timestamp;
}