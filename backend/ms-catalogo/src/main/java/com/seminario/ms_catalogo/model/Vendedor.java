package com.seminario.ms_catalogo.model;

import java.util.ArrayList;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "vendedores")
public class Vendedor {
    @Id
    private String id;
    @Indexed(unique = true)
    private String usuarioId;
    @Indexed(unique = true) 
    private String email;
    private String nombreNegocio;
    private String nombreResponsable;
    private String apellidoResponsable;
    private String telefono;
    private String logo;
    private String banner;
    private Boolean realizaEnvios;
    private String horarioApertura;
    private String horarioCierre;
    private String tiempoEstimadoEspera;
    private Estado estado;
    private Direccion direccion;
    private ArrayList<Producto> productos;
    private Double calificacionPromedio = 0.0;
    private Integer cantidadCalificaciones = 0;
}
