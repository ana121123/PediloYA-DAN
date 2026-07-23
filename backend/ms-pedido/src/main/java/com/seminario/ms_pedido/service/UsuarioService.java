package com.seminario.ms_pedido.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seminario.ms_pedido.client.UsuarioClient;
import com.seminario.ms_pedido.dto.ClienteRequestDTO;
import com.seminario.ms_pedido.dto.DireccionRequestDTO;
import com.seminario.ms_pedido.dto.DireccionResponseDTO;
import com.seminario.ms_pedido.exception.RequestException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsuarioService {

    private final UsuarioClient usuarioClient;
    private final ObjectMapper objectMapper = new ObjectMapper();  
      
    @CircuitBreaker(name = "usuarioClient", fallbackMethod = "buscarDatosDireccionFallback")
    @Retry(name = "usuarioClient")
    public DireccionResponseDTO buscarDatosDireccion(DireccionRequestDTO event, String clienteId) {
        
        try {
            
            return usuarioClient.buscarDatosDireccion(clienteId, event);

        } catch (HttpStatusCodeException e) {
            log.error("Error HTTP desde ms-usuarios: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            
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

            throw new RequestException("USU", 400, HttpStatus.BAD_REQUEST, mensajeReal);
            
        } catch (Exception e) {
            throw new RuntimeException("Error de conexión pura: " + e.getMessage(), e);
        }
    }



    // El método Fallback
    public DireccionResponseDTO buscarDatosDireccionFallback(DireccionRequestDTO event, String clienteId, Throwable t) {
        log.error("Circuit Breaker activado o reintentos agotados. Razón: {}", t.getMessage());
        if (t instanceof RequestException requestException) {
            throw requestException; 
        }
        throw new RequestException("US", 503, HttpStatus.SERVICE_UNAVAILABLE, "Servicio de validación de direcciones temporalmente inactivo.");
    }

    @CircuitBreaker(name = "usuarioClient", fallbackMethod = "eliminarDireccionFallback")
    @Retry(name = "usuarioClient")
    public void eliminarDireccion(String idDireccion) {
        
        try {
            usuarioClient.eliminarDireccion(idDireccion);

        } catch (HttpStatusCodeException e) {
            log.error("Error HTTP desde ms-usuarios: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            
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

            throw new RequestException("USU", 400, HttpStatus.BAD_REQUEST, mensajeReal);
            
        } catch (Exception e) {
            throw new RuntimeException("Error de conexión pura: " + e.getMessage(), e);
        }
    }

    public void eliminarDireccionFallback(String idDireccion, Throwable t) {
        log.error("Circuit Breaker activado o reintentos agotados. Razón: {}", t.getMessage());
        if (t instanceof RequestException requestException) {
            throw requestException; 
        }
        throw new RequestException("US", 503, HttpStatus.SERVICE_UNAVAILABLE, "Servicio de eliminación de direcciones temporalmente inactivo.");
    } 

    

    @CircuitBreaker(name = "usuarioClient", fallbackMethod = "calcularDistanciaFallback")
    @Retry(name = "usuarioClient")
    public Double calcularDistanciaEntreDirecciones(String idVendedorUsuario, String idDireccionCliente) {
        
        try {
            log.info("Solicitando distancia a ms-usuarios. Vendedor: {}, Cliente: {}, Usuario: {}", 
                idVendedorUsuario, idDireccionCliente);

            return usuarioClient.calcularDistanciaEntreDirecciones(idVendedorUsuario, idDireccionCliente);

        } catch (HttpStatusCodeException e) {
            log.error("Error HTTP desde ms-usuarios al calcular distancia: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            
            String mensajeReal = "Error al calcular distancia";
            try {
                JsonNode jsonNode = objectMapper.readTree(e.getResponseBodyAsString());
                mensajeReal = jsonNode.path("message").asText(jsonNode.path("mensaje").asText(mensajeReal));
            } catch (Exception ex) {
                mensajeReal = e.getResponseBodyAsString();
            }

            throw new RequestException("USU", e.getStatusCode().value(), (HttpStatus) e.getStatusCode(), mensajeReal);

        } catch (Exception e) {
            log.error("Error inesperado de comunicación: {}", e.getMessage());
            throw new RequestException("USU", 503, HttpStatus.SERVICE_UNAVAILABLE, "El servicio de usuarios no responde.");
        }
    }

    
    // IMPORTANTE: El método Fallback debe tener la MISMA firma que el original + la excepción
    public Double calcularDistanciaFallback(String idVendedorUsuario, String idDireccionCliente, Throwable t) {
        log.error("Fallback activado para calcularDistancia. Motivo: {}", t.getMessage());
        
        if (t instanceof RequestException requestException) {
            throw requestException;
        }
        
        throw new RequestException("US", 503, HttpStatus.SERVICE_UNAVAILABLE, 
            "El servicio de usuarios no está disponible para calcular la distancia.");
    }
    @CircuitBreaker(name = "usuarioClient", fallbackMethod = "actualizarClienteFallback")
    @Retry(name = "usuarioClient")
    public ClienteRequestDTO actualizarCliente(ClienteRequestDTO clienteRequestDTO) {
        try {
            return usuarioClient.actualizarCliente(clienteRequestDTO);

        } catch (HttpStatusCodeException e) {
            log.error("Error HTTP desde ms-usuarios al actualizar cliente: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RequestException("USU", e.getStatusCode().value(), (HttpStatus) e.getStatusCode(), e.getResponseBodyAsString());

        } catch (Exception e) {
            throw new RequestException("USU", 503, HttpStatus.SERVICE_UNAVAILABLE, "El servicio de usuarios no responde.");
        }
    }

    public ClienteRequestDTO actualizarClienteFallback(ClienteRequestDTO clienteRequestDTO, Throwable t) {
        log.error("Fallback activado para actualizarCliente. Motivo: {}", t.getMessage());

        if (t instanceof RequestException requestException) {
            throw requestException;
        }

        throw new RequestException("US", 503, HttpStatus.SERVICE_UNAVAILABLE,
            "El servicio de usuarios no esta disponible para actualizar el cliente.");
    }
    
}
