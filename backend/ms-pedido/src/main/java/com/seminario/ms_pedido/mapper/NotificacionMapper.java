package com.seminario.ms_pedido.mapper;

import org.springframework.stereotype.Component;

import com.seminario.ms_pedido.dto.NotificacionDTO;
import com.seminario.ms_pedido.model.Notificacion;

@Component
public class NotificacionMapper {

    public NotificacionDTO toDTO(Notificacion entidad) {
        if (entidad == null) return null;

        return NotificacionDTO.builder()
                .id(entidad.getId())
                .mensaje(entidad.getMensaje())
                .pedidoId(entidad.getPedidoId())
                .fechaHora(entidad.getFechaHora().toString()) 
                .leida(entidad.isLeida())
                .build();
    }
}