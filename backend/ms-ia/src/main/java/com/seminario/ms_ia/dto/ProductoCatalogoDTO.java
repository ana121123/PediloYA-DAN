package com.seminario.ms_ia.dto;

import lombok.Data;

@Data
public class ProductoCatalogoDTO {
    private String id;
    private String nombre;
    private String descripcion;
    private double precio;
    private String estado;
    private Boolean disponible;
    private String observaciones;
    private String categoria;
    private String subcategoria;
    private String imagen;
    private String idVendedor;
    private String nombreVendedor;
}
