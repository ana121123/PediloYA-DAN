package com.seminario.ms_pedido.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CalificarPedidoRequestDTO {
    @NotNull
    @Min(1)
    @Max(5)
    private Integer puntuacion;
}
