package com.seminario.ms_pedido.dto;

import lombok.Data;


@Data
public class ClienteRequestDTO {
    private String nombre;
    private String apellido;
    private String email;//no se puede cambiar
    private String telefono;
    private String foto;

}
