package com.seminario.ms_catalogo.service;


import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seminario.ms_catalogo.client.UsuarioClient;
import com.seminario.ms_catalogo.dto.eventos_ms_usuarios.VendedorRegistradoEvent;
import com.seminario.ms_catalogo.exception.RequestException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class UsuarioService {
    
    private final UsuarioClient usuarioClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @CircuitBreaker(name = "usuarioClient", fallbackMethod = "actualizarVendedorFallback")
    @Retry(name = "usuarioClient")
    public VendedorRegistradoEvent actualizarVendedor(VendedorRegistradoEvent vendedorRegistradoEvent) {
        try {            
            return usuarioClient.actualizarVendedor(vendedorRegistradoEvent);
            
        } catch (HttpStatusCodeException e) {
            String mensajeReal = "Error de validación en ms-usuarios";
            try {
                JsonNode jsonNode = objectMapper.readTree(e.getResponseBodyAsString());
                
                if (jsonNode.has("message")) {
                    mensajeReal = jsonNode.get("message").asText();
                } else if (jsonNode.has("mensaje")) {
                    mensajeReal = jsonNode.get("mensaje").asText();
                }
            } catch (Exception ex) {
                mensajeReal = e.getResponseBodyAsString();
            }
            
            throw new RequestException("PED", e.getStatusCode().value(), (HttpStatus) e.getStatusCode(), mensajeReal);

        } catch (Exception e) {
            throw new RuntimeException("Error al sincronizar con ms-usuarios: " + e.getMessage());
        }
    }

    //Fallback method cuando el circuit breaker está abierto
    public VendedorRegistradoEvent actualizarVendedorFallback(VendedorRegistradoEvent vendedorRegistradoEvent, Exception exception) {
        if (exception instanceof RequestException requestException) {
            throw requestException;
        }
        throw new RequestException("CAT", 503, HttpStatus.SERVICE_UNAVAILABLE, 
            "El servicio de usuarios no está disponible. Por favor intente más tarde.");
    }
}

