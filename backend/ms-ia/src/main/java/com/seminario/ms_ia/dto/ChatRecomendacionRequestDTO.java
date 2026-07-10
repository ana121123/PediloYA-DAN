package com.seminario.ms_ia.dto;

import lombok.Data;

@Data
public class ChatRecomendacionRequestDTO {
    private String mensaje;
    private String provincia;
    private String localidad;
}
