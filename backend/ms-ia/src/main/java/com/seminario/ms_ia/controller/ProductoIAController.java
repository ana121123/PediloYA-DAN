package com.seminario.ms_ia.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seminario.ms_ia.dto.DescripcionProductoRequestDTO;
import com.seminario.ms_ia.dto.DescripcionProductoResponseDTO;
import com.seminario.ms_ia.service.IAService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/ia/productos")
@RequiredArgsConstructor
public class ProductoIAController {
    private final IAService iaService;

    @PostMapping("/descripcion")
    public ResponseEntity<DescripcionProductoResponseDTO> descripcion(
            @Valid @RequestBody DescripcionProductoRequestDTO request) {

        String descripcion = iaService.generarOActualizarDescripcion(
                request.getNombreProducto(),
                request.getDescripcionActual()
        );

        return ResponseEntity.ok(new DescripcionProductoResponseDTO(descripcion));
    }
}
