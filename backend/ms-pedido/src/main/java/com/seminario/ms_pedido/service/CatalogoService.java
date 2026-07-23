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

    /**
     * Busca un producto con resiliencia completa.
     * 
     * CACHE:
     * - Key: "productoId_vendedorId"
     * 
     * OBSERVABILIDAD:
     * - Genera spans automáticos para traces distribuidos
     * - Métricas: latencia, tasa de éxito, cache hit rate
     * - Logs estructurados con contexto
     * 
     * @throws ProductoNoEncontradoException si el producto no existe (404)
     * @throws ServicioNoDisponibleException si el servicio está caído o el circuit breaker está abierto
     */
    @CircuitBreaker(name = "catalogo", fallbackMethod = "obtenerIdUsuarioPorVendedorIdFallback")
    @Cacheable(value = "usuarios", key = "#vendedorId")
    @Observed(
        name = "catalogo.obtener-id-usuario-vendedor",
        contextualName = "obtener-id-usuario-vendedor-catalogo"
    )
    public @NonNull ProductoResumidoDTO buscarProducto(@NonNull String productoId, @NonNull String vendedorId) {

        try {
            ProductoResumidoDTO producto = catalogoClient.buscarProducto(productoId, vendedorId);
            
            return producto;
            
        } catch (HttpClientErrorException.NotFound e) {
            // 404: El producto no existe
            throw new ProductoNoEncontradoException(productoId, vendedorId);
            
        } catch (HttpClientErrorException.BadRequest e) {
            // 400: Request mal formado
            throw e;
            
        } catch (HttpClientErrorException e) {
            throw e;
            
        } catch (ResourceAccessException e) {
            // Error de conectividad (timeout, connection refused, etc.)
            log.error("Error de conectividad con MS-Catálogo: {}", e.getMessage());
            throw new ServicioNoDisponibleException("catálogo", e);
        }
    }

    
    private @NonNull ProductoResumidoDTO buscarProductoFallback(@NonNull String productoId, @NonNull String vendedorId, Exception e) {
        
        throw new ServicioNoDisponibleException(
            "catálogo",
            "El servicio de catálogo no está disponible en este momento. " +
            e.getMessage()
        );
    }

    @CircuitBreaker(name = "catalogo", fallbackMethod = "buscarProductoFallback")
    @Cacheable(value = "productos", key = "#productoId + '_' + #vendedorId")
    @Observed(
        name = "catalogo.buscar-producto",
        contextualName = "buscar-producto-catalogo"
    )
    public @NonNull String obtenerIdUsuarioPorVendedorId(@NonNull String vendedorId) {

        try {
            String id = catalogoClient.obtenerIdUsuarioPorVendedorId(vendedorId);
            
            return id;
            
        } catch (HttpClientErrorException.BadRequest e) {
            // 400: Request mal formado
            throw e;
            
        } catch (HttpClientErrorException e) {
            throw e;
            
        } catch (ResourceAccessException e) {
            // Error de conectividad (timeout, connection refused, etc.)
            log.error("Error de conectividad con MS-Catálogo: {}", e.getMessage());
            throw new ServicioNoDisponibleException("catálogo", e);
        }
    }

    
    private @NonNull String obtenerIdUsuarioPorVendedorIdFallback(@NonNull String vendedorId, Exception e) {
        
        throw new ServicioNoDisponibleException(
            "catálogo",
            "El servicio de catálogo no está disponible en este momento. " +
            e.getMessage()
        );
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
