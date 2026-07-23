package com.seminario.ms_pedido.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seminario.ms_pedido.dto.CarritoResponseDTO;
import com.seminario.ms_pedido.dto.ItemCarritoRequestDTO;
import com.seminario.ms_pedido.dto.ProductoResumidoDTO;
import com.seminario.ms_pedido.dto.VendedorResumidoDTO;
import com.seminario.ms_pedido.exception.RequestException;
import com.seminario.ms_pedido.mapper.CarritoMapper;
import com.seminario.ms_pedido.model.Carrito;
import com.seminario.ms_pedido.model.Cliente;
import com.seminario.ms_pedido.model.DetalleCarrito;
import com.seminario.ms_pedido.repository.CarritoRepository;
import com.seminario.ms_pedido.repository.ClienteRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CarritoService {

    private final CarritoRepository carritoRepository;
    private final ClienteRepository clienteRepository;
    private final CarritoMapper carritoMapper;
    private final CatalogoService catalogoService;

    public CarritoResponseDTO agregarOModificarItem(String email, String vendedorId, String productoId, Integer cantidad, String observaciones) {
        // 1. Obtener el cliente desde PostgreSQL usando el email del token
        Cliente cliente = clienteRepository.findByEmail(email)
            .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Cliente no encontrado"));

        // 2. Buscar si ya existe un carrito para este cliente en este local
        Carrito carrito = carritoRepository.findByClienteIdAndVendedorId(cliente.getId(), vendedorId)
            .orElseGet(() -> {
                Carrito nuevo = new Carrito();
                nuevo.setClienteId(cliente.getId());
                nuevo.setVendedorId(vendedorId);
                return nuevo;
            });

        // 3. Buscar el producto en el ms-catalogo para tener precio actualizado
        ProductoResumidoDTO productoDTO = catalogoService.buscarProducto(productoId, vendedorId);

        // 4. Lógica de ítems
        // Buscamos un detalle que coincida en ID Y en la misma observación
        DetalleCarrito detalleExistente = carrito.getDetallesCarrito().stream()
            .filter(d -> d.getProductoId().equals(productoId) && 
                        Objects.equals(d.getObservaciones(), observaciones))
            .findFirst()
            .orElse(null);

        if (detalleExistente != null) {
            // Si coinciden ambos, solo ahí sumamos cantidad
            detalleExistente.setCantidad(detalleExistente.getCantidad() + cantidad);
        } else {
            // Si el producto es igual pero la observación es distinta (o es nuevo), creamos línea nueva
            DetalleCarrito nuevoDetalle = new DetalleCarrito(
                productoId, 
                cantidad, 
                BigDecimal.valueOf(productoDTO.getMontoUnitario()), 
                observaciones
            );
            carrito.addDetalle(nuevoDetalle);
    }

    carrito.calcularMontosTotales();
    return carritoMapper.toResponseDTO(carritoRepository.save(carrito));
    }

    // GET: Un carrito específico de un vendedor
    public CarritoResponseDTO obtenerCarritoPorVendedor(String email, String vendedorId) {
        Cliente cliente = buscarClientePorEmail(email);
        return carritoRepository.findByClienteIdAndVendedorId(cliente.getId(), vendedorId)
        .map(carrito -> {
            carrito.calcularMontosTotales(); 
            return carritoMapper.toResponseDTO(carrito);
        })
        .orElse(CarritoResponseDTO.builder()
                .id(null)
                .vendedorId(vendedorId)
                .items(new ArrayList<>())
                .montoTotalProductos(BigDecimal.ZERO)
                .build());
    }

    // GET: Todos los carritos del cliente (de distintos vendedores)
    public List<CarritoResponseDTO> obtenerTodosLosCarritos(String email) {
        Cliente cliente = buscarClientePorEmail(email);
        List<Carrito> carritos = carritoRepository.findByClienteId(cliente.getId());
        
        return carritos.stream().map(carrito -> {
        carrito.calcularMontosTotales();
        CarritoResponseDTO dto = carritoMapper.toResponseDTO(carrito);
        
        try {
            VendedorResumidoDTO infoVendedor = catalogoService.obtenerDatosVendedor(carrito.getVendedorId());
            
            dto.setNombreVendedor(infoVendedor.getNombreNegocio());
            dto.setRealizaEnvios(infoVendedor.getRealizaEnvios());
            
        } catch (Exception e) {
            dto.setNombreVendedor("Local no disponible");
            dto.setRealizaEnvios(false);
        }
        
        return dto;
    }).toList();
    }

    // DELETE: Borrar uno o más ítems
    public CarritoResponseDTO eliminarItems(String email, String vendedorId, List<String> itemsIds) {
        Cliente cliente = buscarClientePorEmail(email);
        
        Optional<Carrito> carritoOpt = carritoRepository.findByClienteIdAndVendedorId(cliente.getId(), vendedorId);
        
        if (carritoOpt.isEmpty()) {
            return crearCarritoVacioDTO(vendedorId);
        }

        Carrito carrito = carritoOpt.get();

        carrito.getDetallesCarrito().removeIf(detalle -> itemsIds.contains(detalle.getIdItem()));

        if (carrito.getDetallesCarrito().isEmpty()) {
            carritoRepository.delete(carrito);
            return crearCarritoVacioDTO(vendedorId);
        }

        carrito.calcularMontosTotales();
        return carritoMapper.toResponseDTO(carritoRepository.save(carrito));
    }

    private CarritoResponseDTO crearCarritoVacioDTO(String vendedorId) {
        return CarritoResponseDTO.builder()
                .id(null)
                .vendedorId(vendedorId)
                .items(new ArrayList<>())
                .montoTotalProductos(BigDecimal.ZERO)
                .build();
    }

    private Cliente buscarClientePorEmail(String email) {
        return clienteRepository.findByEmail(email)
            .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Cliente no encontrado"));
    }

    @Transactional
    public void eliminarCarritoPorVendedorYCliente(String name, String vendedorId) {
        Cliente cliente = buscarClientePorEmail(name);
        Optional<Carrito> carrito = carritoRepository.findByClienteIdAndVendedorId(cliente.getId(), vendedorId);
        if (carrito.isPresent()) {
            carritoRepository.delete(carrito.get());
        }
    }

    @Transactional
    public CarritoResponseDTO actualizarCantidad(String email, ItemCarritoRequestDTO request) {
        Cliente cliente = buscarClientePorEmail(email);

        Carrito carrito = carritoRepository.findByClienteIdAndVendedorId(cliente.getId(),request.getVendedorId())
                .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Carrito no encontrado"));

        DetalleCarrito detalle = carrito.getDetallesCarrito().stream()
                .filter(d -> d.getProductoId().equals(request.getProductoId()) && 
                            Objects.equals(d.getObservaciones(), request.getObservaciones()))
                .findFirst()
                .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "El producto no está en el carrito"));

        detalle.setCantidad(request.getCantidad());

        carrito.calcularMontosTotales();
        return carritoMapper.toResponseDTO(carritoRepository.save(carrito));
    }

}
