package com.seminario.ms_catalogo.mapper;

import org.springframework.stereotype.Component;

import com.seminario.ms_catalogo.dto.DireccionDTO;
import com.seminario.ms_catalogo.dto.VendedorRequestDTO;
import com.seminario.ms_catalogo.dto.VendedorResponseBusquedaDTO;
import com.seminario.ms_catalogo.dto.VendedorResponseDTO;
import com.seminario.ms_catalogo.dto.VendedorResponsePublicDTO;
import com.seminario.ms_catalogo.dto.eventos_ms_usuarios.VendedorRegistradoEvent;
import com.seminario.ms_catalogo.model.Estado;
import com.seminario.ms_catalogo.model.Vendedor;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class VendedorMapper {
    private final DireccionMapper direccionMapper;
    private final ProductoMapper productoMapper;

    public Vendedor toNewEntity (VendedorRegistradoEvent evento) {
        Vendedor vendedor = new Vendedor();
        vendedor.setUsuarioId(evento.getUsuarioId());
        vendedor.setEmail(evento.getEmail());
        vendedor.setNombreNegocio(evento.getNombreNegocio());
        vendedor.setNombreResponsable(evento.getNombreResponsable());
        vendedor.setApellidoResponsable (evento.getApellidoResponsable());
        vendedor.setTelefono(evento.getTelefono());
        vendedor.setLogo(null);
        vendedor.setBanner(null);
        vendedor.setRealizaEnvios(null);
        vendedor.setHorarioApertura(null);
        vendedor.setHorarioCierre(null);
        vendedor.setTiempoEstimadoEspera(null);
        vendedor.setEstado(Estado.INCOMPLETO);
        vendedor.setProductos(new java.util.ArrayList<>());
        if (evento.getDireccion() != null) {
            vendedor.setDireccion(direccionMapper.toEntity(evento.getDireccion()));
        }

        return vendedor;
    }

    public VendedorResponseDTO toDTO(Vendedor vendedor) {
        VendedorResponseDTO dto = new VendedorResponseDTO();
        //dto.setUsuarioId(vendedor.getUsuarioId());
        dto.setEmail(vendedor.getEmail());
        dto.setNombreNegocio(vendedor.getNombreNegocio());
        dto.setNombreResponsable(vendedor.getNombreResponsable());
        dto.setApellidoResponsable(vendedor.getApellidoResponsable());
        dto.setTelefono(vendedor.getTelefono());
        dto.setLogo(vendedor.getLogo());
        dto.setBanner(vendedor.getBanner());
        dto.setRealizaEnvios(vendedor.getRealizaEnvios());
        dto.setHorarioApertura(vendedor.getHorarioApertura());
        dto.setHorarioCierre(vendedor.getHorarioCierre());
        dto.setTiempoEstimadoEspera(vendedor.getTiempoEstimadoEspera());
        dto.setEstado(vendedor.getEstado().toString());
        dto.setCalificacionPromedio(vendedor.getCalificacionPromedio() != null ? vendedor.getCalificacionPromedio() : 0.0);
        dto.setCantidadCalificaciones(vendedor.getCantidadCalificaciones() != null ? vendedor.getCantidadCalificaciones() : 0);
        if (vendedor.getDireccion() != null) {
            dto.setDireccion(direccionMapper.toDTO(vendedor.getDireccion()));
        }
       
        return dto;
    }

    public Vendedor toEntity(VendedorRequestDTO dto) {
        Vendedor vendedor = new Vendedor();
        vendedor.setNombreNegocio(dto.getNombreNegocio());
        vendedor.setNombreResponsable(dto.getNombreResponsable());
        vendedor.setApellidoResponsable(dto.getApellidoResponsable());
        vendedor.setTelefono(dto.getTelefono());
        vendedor.setLogo(dto.getLogo());
        vendedor.setBanner(dto.getBanner());
        vendedor.setRealizaEnvios(dto.getRealizaEnvios());
        vendedor.setHorarioApertura(dto.getHorarioApertura());
        vendedor.setHorarioCierre(dto.getHorarioCierre());
        vendedor.setTiempoEstimadoEspera(dto.getTiempoEstimadoEspera());
        if (dto.getDireccion() != null) {
            vendedor.setDireccion(direccionMapper.toEntity(dto.getDireccion()));
        }
        return vendedor;
    }

    public VendedorRegistradoEvent toEvent(VendedorRequestDTO vendedorRequestDTO) {
        VendedorRegistradoEvent evento = new VendedorRegistradoEvent();
        evento.setNombreNegocio(vendedorRequestDTO.getNombreNegocio());
        evento.setNombreResponsable(vendedorRequestDTO.getNombreResponsable());
        evento.setApellidoResponsable(vendedorRequestDTO.getApellidoResponsable());
        evento.setTelefono(vendedorRequestDTO.getTelefono());
        if (vendedorRequestDTO.getDireccion() != null) {
            DireccionDTO dirEvento = new DireccionDTO();
            dirEvento.setProvincia(vendedorRequestDTO.getDireccion().getProvincia());
            dirEvento.setLocalidad(vendedorRequestDTO.getDireccion().getLocalidad());
            dirEvento.setCalle(vendedorRequestDTO.getDireccion().getCalle());
            dirEvento.setNumero(vendedorRequestDTO.getDireccion().getNumero());
            dirEvento.setCodigoPostal(vendedorRequestDTO.getDireccion().getCodigoPostal());
            dirEvento.setObservaciones(vendedorRequestDTO.getDireccion().getObservaciones());
        
            evento.setDireccion(dirEvento);
        }
        return evento;
    }

    public VendedorRegistradoEvent toVendedorRegistradoEvent(VendedorRequestDTO vendedorRequestDTO) {
        VendedorRegistradoEvent evento = new VendedorRegistradoEvent();
        evento.setNombreNegocio(vendedorRequestDTO.getNombreNegocio());
        evento.setNombreResponsable(vendedorRequestDTO.getNombreResponsable());
        evento.setApellidoResponsable(vendedorRequestDTO.getApellidoResponsable());
        evento.setTelefono(vendedorRequestDTO.getTelefono());
        if (vendedorRequestDTO.getDireccion() != null) {
            DireccionDTO dirEvent = new DireccionDTO();
            dirEvent.setProvincia(vendedorRequestDTO.getDireccion().getProvincia());
            dirEvent.setLocalidad(vendedorRequestDTO.getDireccion().getLocalidad());
            dirEvent.setCalle(vendedorRequestDTO.getDireccion().getCalle());
            dirEvent.setNumero(vendedorRequestDTO.getDireccion().getNumero());
            dirEvent.setCodigoPostal(vendedorRequestDTO.getDireccion().getCodigoPostal());
            dirEvent.setObservaciones(vendedorRequestDTO.getDireccion().getObservaciones());
            
            evento.setDireccion(dirEvent);
        }
        return evento;
    }

    public VendedorResponseBusquedaDTO toBusquedaDTO(Vendedor vendedor) {
        VendedorResponseBusquedaDTO dto = new VendedorResponseBusquedaDTO();
        dto.setIdVendedor(vendedor.getId());
        dto.setNombreNegocio(vendedor.getNombreNegocio());
        dto.setTelefono(vendedor.getTelefono());
        dto.setRealizaEnvios(vendedor.getRealizaEnvios());
        dto.setHorarioApertura(vendedor.getHorarioApertura());
        dto.setHorarioCierre(vendedor.getHorarioCierre());
        dto.setTiempoEstimadoEspera(vendedor.getTiempoEstimadoEspera());
        dto.setLogo(vendedor.getLogo());
        if (vendedor.getDireccion() != null) {
            dto.setDireccion(direccionMapper.toDTO(vendedor.getDireccion()));
        }
        return dto;
    }

    public VendedorResponsePublicDTO toPublicDTO(Vendedor vendedor) {
        VendedorResponsePublicDTO dto = new VendedorResponsePublicDTO();
        dto.setIdVendedor(vendedor.getId());
        dto.setNombreNegocio(vendedor.getNombreNegocio());
        dto.setTelefono(vendedor.getTelefono());
        dto.setRealizaEnvios(vendedor.getRealizaEnvios());
        dto.setHorarioApertura(vendedor.getHorarioApertura());
        dto.setHorarioCierre(vendedor.getHorarioCierre());
        dto.setTiempoEstimadoEspera(vendedor.getTiempoEstimadoEspera());
        dto.setLogo(vendedor.getLogo());
        dto.setCalificacionPromedio(vendedor.getCalificacionPromedio() != null ? vendedor.getCalificacionPromedio() : 0.0);
        dto.setCantidadCalificaciones(vendedor.getCantidadCalificaciones() != null ? vendedor.getCantidadCalificaciones() : 0);
        if (vendedor.getDireccion() != null) {
            dto.setDireccion(direccionMapper.toDTO(vendedor.getDireccion()));
        }
        if (vendedor.getProductos() != null) {
            dto.setProductos(vendedor.getProductos().stream()
                .filter(p -> p.getEstado() == Estado.ACTIVO && p.getDisponible()==true)    
                .map(productoMapper::toPublicDTO)
                .toList());
        }
        return dto;
    }
    

}
