package com.seminario.ms_catalogo.dto;

import lombok.Data;

@Data
public class VendedorResponseDTO {
    //private String usuarioId;
    private String email;
    private String nombreNegocio;
    private String nombreResponsable;
    private String apellidoResponsable;
    private String telefono;
    private Boolean realizaEnvios;
    private String horarioApertura;
    private String horarioCierre;
    private String tiempoEstimadoEspera;
    private String logo;
    private String banner;
    private String estado;
    private DireccionDTO direccion;
    private Double calificacionPromedio;
    private Integer cantidadCalificaciones;
}
