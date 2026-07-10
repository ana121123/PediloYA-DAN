package com.seminario.ms_ia.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class DescripcionProductoRequestDTO {
    
    @NotBlank(message = "El nombre del producto es obligatorio")
    @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
    private String nombreProducto;

    @Size(max = 500, message = "La descripción no puede superar los 500 caracteres")
    private String descripcionActual;

}
