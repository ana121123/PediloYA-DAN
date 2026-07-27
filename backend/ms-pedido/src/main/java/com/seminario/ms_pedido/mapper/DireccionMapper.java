package com.seminario.ms_pedido.mapper;

import org.springframework.stereotype.Component;

import com.seminario.ms_pedido.dto.DireccionResponseDTO;
import com.seminario.ms_pedido.model.Direccion;
import com.seminario.ms_pedido.model.EstadoDireccion;

@Component
public class DireccionMapper {
    public DireccionResponseDTO toResponseDTO(Direccion direccion) {
        DireccionResponseDTO responseDTO = new DireccionResponseDTO();
        responseDTO.setId(direccion.getId());
        responseDTO.setProvincia(direccion.getProvincia());
        responseDTO.setLocalidad(direccion.getLocalidad());
        responseDTO.setCalle(direccion.getCalle());
        responseDTO.setNumero(direccion.getNumero());
        responseDTO.setCodigoPostal(direccion.getCodigoPostal());
        responseDTO.setLatitud(direccion.getLatitud());
        responseDTO.setLongitud(direccion.getLongitud());
        responseDTO.setObservaciones(direccion.getObservaciones());
        return responseDTO;
    }

    public Direccion toEntity(DireccionResponseDTO dto) {
        if (dto == null) {
            return null;
        }

        Direccion direccion = new Direccion();
        
        direccion.setId(dto.getId()); 
        
        direccion.setProvincia(dto.getProvincia());
        direccion.setLocalidad(dto.getLocalidad());
        direccion.setCalle(dto.getCalle());
        direccion.setNumero(dto.getNumero());
        direccion.setCodigoPostal(dto.getCodigoPostal());
        direccion.setLatitud(dto.getLatitud());
        direccion.setLongitud(dto.getLongitud());
        direccion.setObservaciones(dto.getObservaciones());
        direccion.setEstado(EstadoDireccion.ACTIVO); // Establecer estado activo por defecto al crear una nueva dirección

        return direccion;
    }

}
