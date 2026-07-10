package com.seminario.ms_ia.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.seminario.ms_ia.exception.IAServiceException;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class IAService {
    private final ChatClient chatClient;

    private static final String SYSTEM_PROMPT = """
           Sos un asistente de redacción para el catálogo de una app de pedidos.
            Escribís descripciones breves, directas y concretas para consumidores finales.
            Estilo: lenguaje simple y claro, centrado en ingredientes o características
            reales del producto. Evitá metáforas, lenguaje poético, referencias a recuerdos,
            emociones o sensaciones abstractas (nada de "revive recuerdos", "irresistible",
            "sabor auténtico que transporta", etc.).
            No agregues adjetivos calificativos que no estén en el nombre o la descripción
            actual (por ejemplo: "fresco", "crujiente", "jugoso", "cremoso", "tierno"), aunque
            parezcan típicos del ingrediente. Mencioná los ingredientes tal como fueron
            provistos, sin calificarlos.
            Formato: escribí una o dos oraciones fluidas y bien conectadas (con comas y
            conectores como "y", "con", "acompañado de"), NUNCA fragmentes los ingredientes
            en líneas separadas ni uses saltos de línea entre ellos. El resultado debe leerse
            como un párrafo natural, no como una lista.
            No agregás datos objetivos (ingredientes, precios, origen, cantidades) que no
            te hayan sido provistos explícitamente en el nombre o la descripción actual;
            si no tenés esos datos, describí el producto de forma genérica pero concreta,
            sin inventar ni adornar en exceso.
            Respondés únicamente con el texto de la descripción, sin comillas, sin markdown
            y sin explicaciones adicionales.
            """;
   
    @Autowired
    public IAService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public String generarOActualizarDescripcion(String nombre, String descripcionActual) {
        if (nombre == null || nombre.isBlank()) {
            throw new IAServiceException("El nombre del producto es obligatorio", 2);
        }

        String prompt = (descripcionActual == null || descripcionActual.isBlank())
                ? construirPromptGenerar(nombre)
                : construirPromptMejorar(nombre, descripcionActual);

        try {
            String respuesta = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(prompt)
                    .call()
                    .content();

            return limpiar(respuesta);

        } catch (IAServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error generando descripción con IA para producto '{}'", nombre, ex);
            throw new IAServiceException("No se pudo generar la descripción en este momento");
        }
    }

    private String construirPromptGenerar(String nombre) {
        return """
                Genera una descripción comercial para este producto.

                Producto:
                %s

                Reglas:
                - máximo 3 líneas, en formato de párrafo (oraciones fluidas, sin saltos
                  de línea entre ingredientes o características)
                - lenguaje simple y directo, sin metáforas ni frases poéticas
                - podés mencionar características típicas evidentes por el nombre
                  (por ejemplo: tipo de preparación, formato), sin inventar cantidades ni precios
                """.formatted(nombre);
    }

    private String construirPromptMejorar(String nombre, String descripcionActual) {
        return """
                Mejora esta descripción de producto.

                Producto:
                %s

                Descripción actual:
                %s

                Reglas:
                - conserva la información existente (todos los ingredientes o
                  características mencionadas)
                - unilos en una o dos oraciones fluidas y bien conectadas, en formato
                  de párrafo, sin saltos de línea ni listas
                - mejora redacción y claridad, en lenguaje simple y directo
                - sin metáforas ni frases poéticas
                - máximo 3 líneas
                - no agregues datos objetivos nuevos que no estén en la descripción actual
                """.formatted(nombre, descripcionActual);
    }

    private String limpiar(String texto) {
        if (texto == null) {
            return "";
        }
        return texto.trim().replaceAll("^\"|\"$", "");
    }
}