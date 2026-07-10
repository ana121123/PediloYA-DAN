package com.seminario.ms_ia.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seminario.ms_ia.client.CatalogoClient;
import com.seminario.ms_ia.dto.ChatRecomendacionResponseDTO;
import com.seminario.ms_ia.dto.ProductoCatalogoDTO;
import com.seminario.ms_ia.exception.IAServiceException;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ChatRecomendacionService {
    private final ChatClient chatClient;
    private final CatalogoClient catalogoClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String SYSTEM_PROMPT = """
            Sos un asistente de compras para una app de pedidos (tipo delivery).
            Recibís un mensaje del cliente y una lista de productos disponibles en su zona,
            cada uno con id, nombre, descripción, categoría, subcategoría y precio.

            Tu tarea:
            - Elegí únicamente productos que estén en la lista provista. Nunca inventes
              productos ni ids que no estén en la lista.
            - Si ningún producto de la lista es relevante para el pedido del cliente,
              devolvé una lista vacía de ids y un mensaje amable explicando que no
              encontraste algo así en su zona.
            - Elegí como máximo 5 productos, priorizando los más relevantes.
            - Escribí un mensaje corto y directo (1-2 oraciones), en lenguaje simple,
              sin metáforas ni frases poéticas.

            Respondé ÚNICAMENTE con un JSON con esta forma exacta, sin markdown, sin texto
            adicional antes o después:
            {"mensaje": "...", "idsRecomendados": ["id1", "id2"]}
            """;

    @Autowired
    public ChatRecomendacionService(ChatClient.Builder chatClientBuilder, CatalogoClient catalogoClient) {
        this.chatClient = chatClientBuilder.build();
        this.catalogoClient = catalogoClient;
    }

    public ChatRecomendacionResponseDTO recomendar(String mensaje, String provincia, String localidad) {
        if (mensaje == null || mensaje.isBlank()) {
            throw new IAServiceException("El mensaje es obligatorio", 2);
        }

        List<ProductoCatalogoDTO> disponibles;
        try {
            List<ProductoCatalogoDTO> todos = catalogoClient.buscarProductos(provincia, localidad, "");
            disponibles = todos.stream()
                    .filter(p -> Boolean.TRUE.equals(p.getDisponible()))
                    .toList();
        } catch (Exception ex) {
            log.error("Error consultando catálogo para recomendación IA", ex);
            throw new IAServiceException("No se pudo generar la recomendación en este momento");
        }

        if (disponibles.isEmpty()) {
            return new ChatRecomendacionResponseDTO(
                    "No encontré productos disponibles en tu zona en este momento.",
                    List.of());
        }

        String catalogoJson;
        try {
            List<Map<String, Object>> catalogoCompacto = disponibles.stream()
                    .map(p -> Map.<String, Object>of(
                            "id", p.getId(),
                            "nombre", p.getNombre(),
                            "descripcion", p.getDescripcion() == null ? "" : p.getDescripcion(),
                            "categoria", p.getCategoria() == null ? "" : p.getCategoria(),
                            "subcategoria", p.getSubcategoria() == null ? "" : p.getSubcategoria(),
                            "precio", p.getPrecio()))
                    .toList();
            catalogoJson = objectMapper.writeValueAsString(catalogoCompacto);
        } catch (Exception ex) {
            log.error("Error serializando catálogo para prompt IA", ex);
            throw new IAServiceException("No se pudo generar la recomendación en este momento");
        }

        String prompt = """
                Mensaje del cliente:
                %s

                Productos disponibles (JSON):
                %s
                """.formatted(mensaje, catalogoJson);

        try {
            String respuesta = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(prompt)
                    .call()
                    .content();

            return parsearRespuesta(respuesta, disponibles);

        } catch (IAServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error generando recomendación IA para mensaje '{}'", mensaje, ex);
            throw new IAServiceException("No se pudo generar la recomendación en este momento");
        }
    }

    private ChatRecomendacionResponseDTO parsearRespuesta(String respuestaCruda, List<ProductoCatalogoDTO> disponibles) {
        String limpio = respuestaCruda == null ? "" : respuestaCruda.trim()
                .replaceAll("^```json", "")
                .replaceAll("^```", "")
                .replaceAll("```$", "")
                .trim();

        try {
            Map<String, Object> parsed = objectMapper.readValue(limpio, Map.class);
            String mensaje = (String) parsed.getOrDefault("mensaje", "");
            List<String> ids = (List<String>) parsed.getOrDefault("idsRecomendados", List.of());

            List<ProductoCatalogoDTO> productosGrounded = new ArrayList<>();
            for (String id : ids) {
                disponibles.stream()
                        .filter(p -> p.getId().equals(id))
                        .findFirst()
                        .ifPresent(productosGrounded::add);
            }

            return new ChatRecomendacionResponseDTO(mensaje, productosGrounded);

        } catch (Exception ex) {
            log.error("Error parseando respuesta JSON del LLM: {}", respuestaCruda, ex);
            throw new IAServiceException("No se pudo generar la recomendación en este momento");
        }
    }
}
