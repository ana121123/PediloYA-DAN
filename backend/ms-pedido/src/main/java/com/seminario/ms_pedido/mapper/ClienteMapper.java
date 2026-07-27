package com.seminario.ms_pedido.mapper;

import java.util.ArrayList;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.seminario.ms_pedido.dto.ClienteResponseDTO;
import com.seminario.ms_pedido.dto.DireccionResponseDTO;
import com.seminario.ms_pedido.dto.eventos_ms_usuarios.ClienteRegistradoEvent;
import com.seminario.ms_pedido.model.Cliente;

import lombok.AllArgsConstructor;

@Component
@AllArgsConstructor
public class ClienteMapper {
    private final DireccionMapper direccionMapper;
    public Cliente toEntity(ClienteRegistradoEvent event) {
        Cliente cliente = new Cliente();
        cliente.setId(event.getUsuarioId());
        cliente.setNombre(event.getNombre());
        cliente.setApellido(event.getApellido());
        cliente.setEmail(event.getEmail());
        cliente.setFechaNacimiento(event.getFechaNacimiento());
        cliente.setTelefono(event.getTelefono());
        cliente.setDireccion(null);
        cliente.setPedidos(null);
        return cliente;
    }

    public ClienteResponseDTO toResponseDTO(Cliente cliente) {
        ClienteResponseDTO responseDTO = new ClienteResponseDTO();
        //responseDTO.setId(cliente.getId());
        responseDTO.setNombre(cliente.getNombre());
        responseDTO.setApellido(cliente.getApellido());
        responseDTO.setEmail(cliente.getEmail());
        responseDTO.setTelefono(cliente.getTelefono());
        responseDTO.setFechaNacimiento(cliente.getFechaNacimiento());
        responseDTO.setFoto(cliente.getFoto());
        ArrayList<DireccionResponseDTO> direccionesDTO = cliente.getDireccion() != null ? cliente.getDireccion().stream().map(direccionMapper::toResponseDTO).collect(Collectors.toCollection(ArrayList::new)) : new ArrayList<>();
        responseDTO.setDirecciones(direccionesDTO);
        //responseDTO.setPedidos(null);
        return responseDTO;
    }

    

}
