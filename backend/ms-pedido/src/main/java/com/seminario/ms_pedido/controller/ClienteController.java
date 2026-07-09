package com.seminario.ms_pedido.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seminario.ms_pedido.dto.ClienteRequestDTO;
import com.seminario.ms_pedido.dto.ClienteResponseDTO;
import com.seminario.ms_pedido.dto.eventos_ms_usuarios.ClienteRegistradoEvent;
import com.seminario.ms_pedido.service.ClienteService;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/clientes")
@RequiredArgsConstructor
@Slf4j
public class ClienteController {
    private final ClienteService clienteService;
   
    @PostMapping("/registrar")
    @Operation(summary = "Registra un nuevo cliente. Llamado internamente por ms-usuarios")
    public ResponseEntity<Void> registrarCliente(@RequestBody ClienteRegistradoEvent cliente){
        clienteService.registrarCliente(cliente);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
    
    @GetMapping("/perfil")
    @Operation(summary = "Obtiene perfil de un cliente logueado")
    public ResponseEntity<ClienteResponseDTO> obtenerCliente(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(clienteService.obtenerPerfilPorEmail(email));
    }

    @PutMapping("/actualizar")
    @Operation(summary = "Actualiza el perfil de un cliente logueado")
    public ResponseEntity<ClienteResponseDTO> updateCliente(
            @RequestBody ClienteRequestDTO clienteRequestDTO,
            Authentication authentication) { 
        
        String email = authentication.getName();
        
        return clienteService.updateCliente(clienteRequestDTO, email);
    }



}
