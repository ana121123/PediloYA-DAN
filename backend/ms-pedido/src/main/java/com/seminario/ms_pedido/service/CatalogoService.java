package com.seminario.ms_pedido.service;

import java.util.List;

import org.jspecify.annotations.NonNull;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import com.seminario.ms_pedido.client.CatalogoClient;
import com.seminario.ms_pedido.dto.CalificacionVendedorRequestDTO;
import com.seminario.ms_pedido.dto.ProductoResumidoDTO;
import com.seminario.ms_pedido.dto.VendedorResumidoDTO;
import com.seminario.ms_pedido.exception.ProductoNoEncontradoException;
import com.seminario.ms_pedido.exception.ServicioNoDisponibleException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Servicio de integración con el microservicio de Catálogo.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogoService {
    
    private final CatalogoClient catalogoClient;

    @CircuitBreaker(name = "catalogo", fallbackMethod = "buscarProductoFallback")
    public @NonNull ProductoResumidoDTO buscarProducto(@NonNull String productoId, @NonNull String vendedorId) {
        return catalogoClient.buscarProducto(productoId, vendedorId);
    }

    private @NonNull ProductoResumidoDTO buscarProductoFallback(@NonNull String productoId, @NonNull String vendedorId, Throwable t) {
        if (t instanceof HttpClientErrorException.NotFound) {
            throw new ProductoNoEncontradoException(productoId, vendedorId);
        }
        log.error("Error de conectividad con MS-Catálogo: {}", t.getMessage());
        throw new ServicioNoDisponibleException(
            "catálogo",
            "El servicio de catálogo no está disponible en este momento. " + t.getMessage());
    }

    @CircuitBreaker(name = "catalogo", fallbackMethod = "obtenerIdUsuarioPorVendedorIdFallback")
    public @NonNull String obtenerIdUsuarioPorVendedorId(@NonNull String vendedorId) {
        return catalogoClient.obtenerIdUsuarioPorVendedorId(vendedorId);
    }

    private @NonNull String obtenerIdUsuarioPorVendedorIdFallback(@NonNull String vendedorId, Throwable t) {
        if (t instanceof HttpClientErrorException.BadRequest) {
            throw (HttpClientErrorException.BadRequest) t;
        }
        log.error("Error de conectividad con MS-Catálogo: {}", t.getMessage());
        throw new ServicioNoDisponibleException(
            "catálogo",
            "El servicio de catálogo no está disponible en este momento. " + t.getMessage());
    }

    @CircuitBreaker(name = "catalogo", fallbackMethod = "obtenerEmailPorVendedorIdFallback")
    public @NonNull String obtenerEmailPorVendedorId(@NonNull String vendedorId) {
        return catalogoClient.obtenerEmailPorVendedorId(vendedorId);
    }

    private @NonNull String obtenerEmailPorVendedorIdFallback(@NonNull String vendedorId, Exception e) {
        throw new ServicioNoDisponibleException("catalogo", "No se pudo obtener el email del vendedor. " + e.getMessage());
    }

    @CircuitBreaker(name = "catalogo", fallbackMethod = "obtenerDatosVendedorFallback")
    public @NonNull VendedorResumidoDTO obtenerDatosVendedor(@NonNull String vendedorId) {
        return catalogoClient.obtenerDatosVendedor(vendedorId);
    }

    private @NonNull VendedorResumidoDTO obtenerDatosVendedorFallback(@NonNull String vendedorId, Exception e) {
        throw new ServicioNoDisponibleException("catalogo", "No se pudieron obtener los datos del vendedor. " + e.getMessage());
    }

    @CircuitBreaker(name = "catalogo", fallbackMethod = "obtenerDatosProductoFallback")
    public @NonNull List<String> obtenerDatosProducto(@NonNull String productoId, @NonNull String vendedorId) {
        return catalogoClient.obtenerDatosProducto(productoId, vendedorId);
    }

    private @NonNull List<String> obtenerDatosProductoFallback(@NonNull String productoId, @NonNull String vendedorId, Exception e) {
        throw new ServicioNoDisponibleException("catalogo", "No se pudieron obtener los datos del producto. " + e.getMessage());
    }

    @CircuitBreaker(name = "catalogo", fallbackMethod = "obtenerIdPorEmailFallback")
    public @NonNull String obtenerIdPorEmail(@NonNull String email) {
        return catalogoClient.obtenerIdPorEmail(email);
    }

    private @NonNull String obtenerIdPorEmailFallback(@NonNull String email, Exception e) {
        throw new ServicioNoDisponibleException("catalogo", "No se pudo obtener el vendedor por email. " + e.getMessage());
    }

    @CircuitBreaker(name = "catalogo", fallbackMethod = "actualizarCalificacionVendedorFallback")
    public void actualizarCalificacionVendedor(@NonNull String vendedorId, @NonNull CalificacionVendedorRequestDTO dto) {
        catalogoClient.actualizarCalificacionVendedor(vendedorId, dto);
    }

    private void actualizarCalificacionVendedorFallback(@NonNull String vendedorId, @NonNull CalificacionVendedorRequestDTO dto, Exception e) {
        throw new ServicioNoDisponibleException("catalogo", "No se pudo actualizar la calificacion del vendedor. " + e.getMessage());
    }

}
