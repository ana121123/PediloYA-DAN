package com.seminario.ms_pedido.mapper;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Component;

import com.seminario.ms_pedido.dto.DetallePedidoDTO;
import com.seminario.ms_pedido.model.DetallePedido;
import com.seminario.ms_pedido.service.CatalogoService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DetallePedidoMapper {
    private final CatalogoService catalogoService;

    public DetallePedidoDTO toDTO(DetallePedido detalle) {
       List<String> datosProducto = obtenerDatosProducto(detalle.getIdProducto(), detalle.getPedido().getVendedorId());
        return DetallePedidoDTO.builder()
                .id(detalle.getId())
                .nombreProducto(datosProducto.get(0))
                .imagen(datosProducto.get(1))
                .productoId(detalle.getIdProducto())
                .cantidad(detalle.getCantidad())
                .montoUnitario(detalle.getMontoUnitario())
                .subtotal(detalle.getMontoUnitario().multiply(BigDecimal.valueOf(detalle.getCantidad())))
                .observaciones(detalle.getObservaciones())
                .build();
    }


    // Método para obtener datos del producto desde el ms-catalogo ([0] nombre del producto, [1] imagen)
    public List<String> obtenerDatosProducto(String productoId, String vendedorId) {
        return catalogoService.obtenerDatosProducto(productoId, vendedorId);
    }
}
