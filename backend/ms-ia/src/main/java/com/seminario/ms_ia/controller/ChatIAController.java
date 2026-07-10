package com.seminario.ms_ia.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seminario.ms_ia.dto.ChatRecomendacionRequestDTO;
import com.seminario.ms_ia.dto.ChatRecomendacionResponseDTO;
import com.seminario.ms_ia.service.ChatRecomendacionService;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/ia/chat")
@RequiredArgsConstructor
public class ChatIAController {
    private final ChatRecomendacionService chatRecomendacionService;

    @PostMapping("/recomendar")
    @Operation(summary = "Recomienda productos del catálogo según el mensaje del cliente")
    public ChatRecomendacionResponseDTO recomendar(@RequestBody ChatRecomendacionRequestDTO request) {
        return chatRecomendacionService.recomendar(
                request.getMensaje(), request.getProvincia(), request.getLocalidad());
    }
}
