package com.seminario.ms_catalogo.dto;

import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@Data
public class VendedorResponsePublicDTO {
    private String idVendedor;
    private String nombreNegocio;
    private String telefono;
    private Boolean realizaEnvios;
    private String horarioApertura;
    private String horarioCierre;
    private String tiempoEstimadoEspera;
    private String logo;
    private DireccionDTO direccion;
    private List<ProductoResponsePublicDTO> productos;
    private Double calificacionPromedio;
    private Integer cantidadCalificaciones;
}
