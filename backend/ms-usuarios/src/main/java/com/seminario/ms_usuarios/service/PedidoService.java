package com.seminario.ms_usuarios.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.seminario.ms_usuarios.client.PedidoClient;
import com.seminario.ms_usuarios.dto.eventos_ms_pedidio.ClienteRegistradoEvent;
import com.seminario.ms_usuarios.exception.RequestException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class PedidoService {
    private final PedidoClient pedidoClient;

    @Value("${pedido.ms.url:http://localhost:8082}")
    private String pedidoBaseUrl;
    @CircuitBreaker(name = "pedidoClient", fallbackMethod = "registrarClienteFallback")
    @Retry(name = "pedidoClient")
    public void registrarCliente(ClienteRegistradoEvent evento) {
        /* COMENTADO PARA USAR KAFKA
        try {
            pedidoClient.registrarCliente(evento);

        } catch (Exception e) {
            log.error("FALLO REAL AL LLAMAR A PEDIDO: " + e.getMessage());
            // e.printStackTrace(); 
            throw new RequestException("PED", 500, HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error al sincronizar con ms-pedido: " + e.getMessage());
        }
        */
        log.info("Sincronización sincrónica con ms-pedido omitida (usando Kafka). Evento: {}", evento.getUsuarioId());
    }
    
    //Fallback method cuando el circuit breaker está abierto
    public void registrarClienteFallback(ClienteRegistradoEvent evento, Exception exception) {
        //System.out.println(">>> ERROR REAL OCULTO EN PEDIDO: " + exception.getMessage());
        exception.printStackTrace();

        throw new RequestException("PED", 503, HttpStatus.SERVICE_UNAVAILABLE,
                "El servicio de pedido no está disponible. Por favor intente más tarde.");
    }

}
