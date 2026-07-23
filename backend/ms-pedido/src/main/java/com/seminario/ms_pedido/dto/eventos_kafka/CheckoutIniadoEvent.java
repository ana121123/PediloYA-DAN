package com.seminario.ms_pedido.dto.eventos_kafka;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ========== EVENTOS DE ENTRADA (ms-pedido ESCUCHA) ==========
 * Estos DTOs representan eventos que otros microservicios publican
 * y que ms-pedido consume
 */

/**
 * Evento: Cliente inicia checkout desde el carrito
 * Reemplaza: POST /pedidos/iniciar-checkout/{vendedorId}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutIniadoEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String vendedorId;           // A cuál vendedor
    private String usuarioId;            // Email del cliente que hace checkout
    private String correlationId;        // Para tracing distribuido
}

