package com.seminario.ms_pedido.dto;

import java.time.LocalDate;
import java.util.ArrayList;

import lombok.Data;

@Data
public class ClienteResponseDTO {
    //private String id;
    private String nombre;
    private String apellido;
    private String email;
    private String telefono;
    private LocalDate fechaNacimiento;
    private String foto;
    private ArrayList<DireccionResponseDTO> direcciones;
    //private ArrayList<PedidoResponseDTO> pedidos; 
    


}
