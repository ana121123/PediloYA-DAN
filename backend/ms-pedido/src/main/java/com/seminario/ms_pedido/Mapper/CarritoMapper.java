package com.seminario.ms_pedido.mapper;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Component; 

import com.seminario.ms_pedido.dto.CarritoResponseDTO;
import com.seminario.ms_pedido.dto.ItemCarritoResponseDTO;
import com.seminario.ms_pedido.dto.ProductoResumidoDTO;
import com.seminario.ms_pedido.dto.VendedorResumidoDTO;
import com.seminario.ms_pedido.model.Carrito;
import com.seminario.ms_pedido.service.CatalogoService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CarritoMapper {
    private final CatalogoService catalogoService;

    public CarritoResponseDTO toResponseDTO(Carrito carrito) {
        List<ItemCarritoResponseDTO> items = carrito.getDetallesCarrito().stream()
            .map(detalle -> {
                ProductoResumidoDTO prod = catalogoService.buscarProducto(detalle.getProductoId(), carrito.getVendedorId());
                
                return ItemCarritoResponseDTO.builder()
                    .idItem(detalle.getIdItem())
                    .productoId(detalle.getProductoId())
                    .nombreProducto(prod.getNombre())
                    .urlImagen(prod.getImagenUrl())
                    .cantidad(detalle.getCantidad())
                    .montoUnitario(detalle.getMontoUnitario())
                    .subtotal(detalle.getMontoUnitario().multiply(BigDecimal.valueOf(detalle.getCantidad())))
                    .observaciones(detalle.getObservaciones())
                    .build();
            }).toList();

        
        VendedorResumidoDTO datosVendedor = catalogoService.obtenerDatosVendedor(carrito.getVendedorId());

        return CarritoResponseDTO.builder()
            .id(carrito.getId())
            .vendedorId(carrito.getVendedorId())
            .nombreVendedor(datosVendedor.getNombreNegocio()) 
            .realizaEnvios(datosVendedor.getRealizaEnvios())
            .montoTotalProductos(carrito.getMontoTotalProductos())
            .comisionApp(carrito.getComisionApp())
            .montoTotal(carrito.getMontoTotal())
            .items(items)
            .build();
    }
    /*public static CarritoDTO toDTO(Carrito carrito) {
        CarritoDTO dto = new CarritoDTO();
        
        dto.setVendedorId(carrito.getVendedorId());
        dto.setMontoTotal(carrito.getMontoTotal());
        dto.setMontoTotalProductos(carrito.getMontoTotalProductos());

        dto.setDetallesCarrito(
            carrito.getDetallesCarrito()
            .stream()
            .map(DetalleCarritoMapper::toDTO)
            .collect(Collectors.toCollection(ArrayList::new))
        );

        return dto;
    }*/
}
