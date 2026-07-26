package com.seminario.ms_ia.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.seminario.ms_ia.client.CatalogoClient;
import com.seminario.ms_ia.dto.ProductoCatalogoDTO;
import com.seminario.ms_ia.exception.IAServiceException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogoService {

    private final CatalogoClient catalogoClient;

    @CircuitBreaker(name = "catalogoClient", fallbackMethod = "buscarProductosFallback")
    public List<ProductoCatalogoDTO> buscarProductos(String provincia, String localidad, String filtro) {
        return catalogoClient.buscarProductos(provincia, localidad, filtro);
    }

    public List<ProductoCatalogoDTO> buscarProductosFallback(String provincia, String localidad, String filtro, Throwable t) {
        log.error("Fallback activado para catalogoClient en recomendacion IA. Motivo: {}", t.getMessage());
        throw new IAServiceException("No se pudo consultar el catalogo en este momento");
    }
}
