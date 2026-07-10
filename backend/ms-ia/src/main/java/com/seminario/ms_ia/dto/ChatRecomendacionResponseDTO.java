package com.seminario.ms_ia.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChatRecomendacionResponseDTO {
    private String mensaje;
    private List<ProductoCatalogoDTO> productosRecomendados;
}
