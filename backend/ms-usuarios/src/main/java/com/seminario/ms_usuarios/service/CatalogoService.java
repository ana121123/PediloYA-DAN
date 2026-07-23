package com.seminario.ms_usuarios.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.seminario.ms_usuarios.client.CatalogoClient;
import com.seminario.ms_usuarios.dto.eventos_ms_catalogo.VendedorRegistradoEvent;
import com.seminario.ms_usuarios.exception.RequestException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class CatalogoService {

    private final CatalogoClient catalogoClient;

    @CircuitBreaker(name = "catalogoClient", fallbackMethod = "registrarVendedorFallback")
    @Retry(name = "catalogoClient")
    public void registrarVendedor(VendedorRegistradoEvent evento) {
        try {
            catalogoClient.registrarVendedor(evento);
            
        } catch (Exception e) {
            log.error("FALLO REAL AL LLAMAR A CATALOGO: " + e.getMessage()); 
            // e.printStackTrace();
            throw new RequestException("CAT", 500, HttpStatus.INTERNAL_SERVER_ERROR, 
                "Error al sincronizar con ms-catalogo: " + e.getMessage());
        }
    }

    //Fallback method cuando el circuit breaker está abierto
    public void registrarVendedorFallback(VendedorRegistradoEvent evento, Exception exception) {
        //System.out.println(">>> ERROR REAL OCULTO: " + exception.getMessage());
        exception.printStackTrace();
        
        throw new RequestException("CAT", 503, HttpStatus.SERVICE_UNAVAILABLE, 
            "El servicio de catálogo no está disponible. Por favor intente más tarde.");
    }
}


