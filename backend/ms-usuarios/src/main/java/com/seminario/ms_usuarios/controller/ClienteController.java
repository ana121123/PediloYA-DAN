package com.seminario.ms_usuarios.controller;

import org.jspecify.annotations.NonNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.seminario.ms_usuarios.dto.eventos_ms_pedidio.ClienteActualizarDTO;
import com.seminario.ms_usuarios.service.ClienteService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;


@RequiredArgsConstructor
@RestController
@RequestMapping("/clientes")
public class ClienteController {
    private final ClienteService clienteService;
    /*private final DireccionService direccionService;
   

    @PostMapping("{usuarioId}/direcciones")
    @Operation(summary = "Registra una nueva dirección para un cliente")    
    public ResponseEntity<DireccionResponseEvent> registrarDireccion(@Valid @RequestBody DireccionRequestDTO dto, @PathVariable String usuarioId) {
        Cliente cliente = clienteService.buscarPorId(usuarioId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado con ID: " + usuarioId));
        return direccionController.registrarDireccionCliente(dto, cliente);
    }*/

    /*@GetMapping("/direcciones")
    @Operation(summary = "Obtiene todas las direcciones de un cliente")
    public ResponseEntity<ArrayList<DireccionResponseDTO>> obtenerDirecciones(@PathVariable String usuarioId) {
        Cliente cliente = clienteService.buscarPorId(usuarioId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado con ID: " + usuarioId));
        return direccionController.obtenerDirecciones(cliente);
    }*/
    
    //actualizar cliente
    @PutMapping("/actualizar")
    @Operation(summary = "Actualiza los datos de un cliente")
    public ResponseEntity<ClienteActualizarDTO>  actualizarCliente(@RequestBody @NonNull ClienteActualizarDTO clienteActualizarDTO){
        return ResponseEntity.ok(clienteService.actualizarCliente(clienteActualizarDTO));

    }
}
