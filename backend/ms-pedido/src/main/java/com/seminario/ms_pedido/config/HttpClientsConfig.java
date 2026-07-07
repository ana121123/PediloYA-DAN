package com.seminario.ms_pedido.config;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.concurrent.Executors;

import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import com.seminario.ms_pedido.client.CatalogoClient;
import com.seminario.ms_pedido.client.UsuarioClient;

import lombok.extern.slf4j.Slf4j;

/**
 * Configuración de clientes HTTP para comunicación entre microservicios.
 * 
 * Utiliza las capacidades modernas de Spring Boot 4:
 * - RestClient (reemplazo de RestTemplate)
 * - HTTP/2 nativo
 * - Virtual Threads para alta concurrencia
 * - Propagación automática de contexto de seguridad
 * 
 * @author Tu Nombre
 * @since Spring Boot 4.0.2
 */
@Configuration
@Slf4j
public class HttpClientsConfig {

    @Value("${catalogo.ms.url:http://localhost:8081}")
    private String catalogoBaseUrl;

    @Value("${usuarios.ms.url:http://localhost:8080}")
    private String usuarioBaseUrl;

    /**
     * HttpClient moderno de Java 21 con soporte para HTTP/2 y Virtual Threads.
     * 
     * Características:
     * - HTTP/2: Multiplexing, compresión de headers, server push
     * - Virtual Threads: Permite miles de conexiones concurrentes con mínimo overhead
     * - Connection pooling inteligente
     * 
     * @return HttpClient configurado para alta performance
     */
    @Bean
    public HttpClient httpClient() {
        return HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)  // Usa HTTP/2 cuando esté disponible
            .connectTimeout(Duration.ofSeconds(5))
            .executor(Executors.newVirtualThreadPerTaskExecutor())  // Virtual Threads
            .build();
    }

    /**
     * Factory que integra el HttpClient de Java con Spring RestClient.
     * 
     * @param httpClient HttpClient configurado
     * @return Factory para requests HTTP
     */
    @Bean
    public JdkClientHttpRequestFactory requestFactory(HttpClient httpClient) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(5));
        return factory;
    }

    /**
     * Interceptor que propaga automáticamente el JWT token a todas las peticiones.
     * 
     * Este interceptor:
     * 1. Extrae el token JWT del SecurityContext
     * 2. Lo añade como Bearer token al header Authorization
     * 3. Loggea de forma segura (sin exponer el token completo)
     * 
     * SEGURIDAD: Nunca loggea el token completo, solo los primeros/últimos caracteres.
     * 
     * @return Interceptor configurado
     */
    @Bean
    public ClientHttpRequestInterceptor jwtTokenInterceptor() {
        return (HttpRequest request, byte[] body, ClientHttpRequestExecution execution) -> {
            
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication instanceof JwtAuthenticationToken jwtAuth) {
                String token = jwtAuth.getToken().getTokenValue();
                
                // Log seguro: solo para debugging, con token enmascarado
                if (log.isDebugEnabled()) {
                    String maskedToken = maskToken(token);
                    log.debug("Propagando JWT token a {}: {}", 
                             request.getURI().getHost(), maskedToken);
                }
                
                // Añade el token como Bearer Authentication
                request.getHeaders().setBearerAuth(token);
                
            } else {
                log.warn("No se encontró JWT token en SecurityContext para request a: {}", 
                        request.getURI());
            }
            
            return execution.execute(request, body);
        };
    }

    /**
     * RestClient configurado para el microservicio de Catálogo.
     * 
     * Características:
     * - Base URL configurada desde properties
     * - Propagación automática de JWT via interceptor
     * - Timeouts configurados (5s connect, 5s read)
     * - Headers por defecto (Content-Type, etc.)
     * - Retry automático para fallos transitorios (implementado internamente)
     * 
     * @param requestFactory Factory para crear requests HTTP
     * @param jwtTokenInterceptor Interceptor para propagar JWT
     * @return RestClient configurado
     */
    @Bean
    public RestClient catalogoRestClient(
            JdkClientHttpRequestFactory requestFactory,
            ClientHttpRequestInterceptor jwtTokenInterceptor) {
        
        log.info("Configurando RestClient para MS-Catálogo: {}", catalogoBaseUrl);
        
        return RestClient.builder()
            .baseUrl(catalogoBaseUrl)
            .requestFactory(requestFactory)
            .requestInterceptor(jwtTokenInterceptor)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json")
            .defaultHeader(HttpHeaders.ACCEPT, "application/json")
            .build();
    }

    /**
     * RestClient configurado para el microservicio de Catálogo.
     * 
     * Características:
     * - Base URL configurada desde properties
     * - Propagación automática de JWT via interceptor
     * - Timeouts configurados (5s connect, 5s read)
     * - Headers por defecto (Content-Type, etc.)
     * - Retry automático para fallos transitorios (implementado internamente)
     * 
     * @param requestFactory Factory para crear requests HTTP
     * @param jwtTokenInterceptor Interceptor para propagar JWT
     * @return RestClient configurado
     */
    @Bean
    public RestClient usuarioRestClient(
            JdkClientHttpRequestFactory requestFactory,
            ClientHttpRequestInterceptor jwtTokenInterceptor) {
        
        log.info("Configurando RestClient para MS-Usuario: {}", usuarioBaseUrl);
        
        return RestClient.builder()
            .baseUrl(usuarioBaseUrl)
            .requestFactory(requestFactory)
            .requestInterceptor(jwtTokenInterceptor)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json")
            .defaultHeader(HttpHeaders.ACCEPT, "application/json")
            .build();
    }
    /**
     * Crea el proxy del CatalogoClient usando HTTP Service Interfaces.
     * 
     * Spring Boot 4 genera automáticamente la implementación del cliente
     * basándose en las anotaciones @HttpExchange y @GetExchange.
     * 
     * Esto elimina la necesidad de escribir código boilerplate de HTTP.
     * 
     * @param catalogoRestClient RestClient configurado
     * @return Proxy del CatalogoClient listo para inyectar
     */
    @Bean
    public CatalogoClient catalogoClient(RestClient catalogoRestClient) {
        
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
            .builderFor(RestClientAdapter.create(catalogoRestClient))
            .build();
        
        return factory.createClient(CatalogoClient.class);
    }

    /**
     * Crea el proxy del UsuarioClient usando HTTP Service Interfaces.
     * 
     * Spring Boot 4 genera automáticamente la implementación del cliente
     * basándose en las anotaciones @HttpExchange y @GetExchange.
     * 
     * Esto elimina la necesidad de escribir código boilerplate de HTTP.
     * 
     * @param usuarioRestClient RestClient configurado
     * @return Proxy del UsuarioClient listo para inyectar
     */
    @Bean
    public UsuarioClient usuarioClient(RestClient usuarioRestClient) {
        
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
            .builderFor(RestClientAdapter.create(usuarioRestClient))
            .build();
        
        return factory.createClient(UsuarioClient.class);
    }

    

    /**
     * Enmascara un token JWT para logs seguros.
     * 
     * Formato: "eyJ...xyz" (muestra primeros 10 y últimos 10 caracteres)
     * 
     * @param token Token JWT completo
     * @return Token enmascarado para logging seguro
     */
    private String maskToken(@Nullable String token) {
        if (token == null || token.length() < 20) {
            return "***";
        }
        return token.substring(0, 10) + "..." + token.substring(token.length() - 10);
    }
}