package com.seminario.ms_usuarios.dto.eventos_ms_pedidio;

import lombok.Data;

@Data
public class ClienteActualizarDTO {
    private String nombre;
    private String apellido;
    private String email;//no se puede cambiar
    private String telefono;
    private String foto;

}
