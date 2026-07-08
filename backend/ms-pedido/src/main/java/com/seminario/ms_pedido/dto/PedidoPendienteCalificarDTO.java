package com.seminario.ms_pedido.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PedidoPendienteCalificarDTO {
    private String id;
    private String vendedorId;
    private String nombreVendedor;
    private Integer cantidadItems;
}
