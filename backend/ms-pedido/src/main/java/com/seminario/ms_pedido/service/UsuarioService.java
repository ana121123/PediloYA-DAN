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
        return usuarioClient.buscarDatosDireccion(clienteId, event);
    }

    public DireccionResponseDTO buscarDatosDireccionFallback(DireccionRequestDTO event, String clienteId, Throwable t) {
        log.error("Circuit Breaker activado o reintentos agotados. Razón: {}", t.getMessage());
        throw mapearError(t, "Servicio de validación de direcciones temporalmente inactivo.");
    }

    @CircuitBreaker(name = "usuarioClient", fallbackMethod = "eliminarDireccionFallback")
    @Retry(name = "usuarioClient")
    public void eliminarDireccion(String idDireccion) {
        usuarioClient.eliminarDireccion(idDireccion);
    }

    public void eliminarDireccionFallback(String idDireccion, Throwable t) {
        log.error("Circuit Breaker activado o reintentos agotados. Razón: {}", t.getMessage());
        throw mapearError(t, "Servicio de eliminación de direcciones temporalmente inactivo.");
    }

    @CircuitBreaker(name = "usuarioClient", fallbackMethod = "calcularDistanciaFallback")
    @Retry(name = "usuarioClient")
    public Double calcularDistanciaEntreDirecciones(String idVendedorUsuario, String idDireccionCliente) {
        return usuarioClient.calcularDistanciaEntreDirecciones(idVendedorUsuario, idDireccionCliente);
    }

    public Double calcularDistanciaFallback(String idVendedorUsuario, String idDireccionCliente, Throwable t) {
        log.error("Fallback activado para calcularDistancia. Motivo: {}", t.getMessage());
        throw mapearError(t, "El servicio de usuarios no está disponible para calcular la distancia.");
    }

    @CircuitBreaker(name = "usuarioClient", fallbackMethod = "actualizarClienteFallback")
    @Retry(name = "usuarioClient")
    public ClienteRequestDTO actualizarCliente(ClienteRequestDTO clienteRequestDTO) {
        return usuarioClient.actualizarCliente(clienteRequestDTO);
    }

    public ClienteRequestDTO actualizarClienteFallback(ClienteRequestDTO clienteRequestDTO, Throwable t) {
        log.error("Fallback activado para actualizarCliente. Motivo: {}", t.getMessage());
        throw mapearError(t, "El servicio de usuarios no está disponible para actualizar el cliente.");
    }

    // Helper único para no repetir el parseo de error en cada fallback
    private RequestException mapearError(Throwable t, String mensajeServicioCaido) {
        if (t instanceof HttpStatusCodeException e) {
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
            return new RequestException("USU", e.getStatusCode().value(), (HttpStatus) e.getStatusCode(), mensajeReal);
        }
        return new RequestException("US", 503, HttpStatus.SERVICE_UNAVAILABLE, mensajeServicioCaido);
    }
   
}
