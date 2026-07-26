package com.seminario.ms_ia.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.seminario.ms_ia.client.CatalogoClient;
import com.seminario.ms_ia.dto.ProductoCatalogoDTO;
import com.seminario.ms_ia.exception.IAServiceException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogoGatewayService {
    private final CatalogoClient catalogoClient;

    @Retry(name = "catalogoClient")
    @CircuitBreaker(name = "catalogoClient", fallbackMethod = "fallback")
    public List<ProductoCatalogoDTO> buscarProductos(String provincia, String localidad) {
        return catalogoClient.buscarProductos(provincia, localidad, "");
    }

    private List<ProductoCatalogoDTO> fallback(String provincia, String localidad, Throwable t) {
        log.error("catalogoClient fallback ({}): {}", t.getClass().getSimpleName(), t.getMessage());
        throw new IAServiceException("No se pudo generar la recomendación en este momento. Inténtelo más tarde");
    }
}
