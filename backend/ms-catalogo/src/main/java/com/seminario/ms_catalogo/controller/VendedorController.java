package com.seminario.ms_catalogo.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.seminario.ms_catalogo.dto.CalificacionVendedorRequestDTO;
import com.seminario.ms_catalogo.dto.ProductoRequestDTO;
import com.seminario.ms_catalogo.dto.ProductoResponseBusquedaDTO;
import com.seminario.ms_catalogo.dto.ProductoResponseDTO;
import com.seminario.ms_catalogo.dto.VendedorRequestDTO;
import com.seminario.ms_catalogo.dto.VendedorResponseBusquedaDTO;
import com.seminario.ms_catalogo.dto.VendedorResponseDTO;
import com.seminario.ms_catalogo.dto.VendedorResponsePublicDTO;
import com.seminario.ms_catalogo.dto.VendedorResumidoDTO;
import com.seminario.ms_catalogo.dto.eventos_ms_usuarios.VendedorRegistradoEvent;
import com.seminario.ms_catalogo.service.VendedorService;

import com.seminario.ms_catalogo.dto.CalificacionVendedorRequestDTO;
import org.springframework.web.bind.annotation.PatchMapping;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/vendedores")
@RequiredArgsConstructor
@Slf4j
public class VendedorController {
    private final VendedorService vendedorService;

    /*@PostMapping("/agregar-producto")
    public ResponseEntity<ProductoResponseDTO> agregarProducto(@RequestBody ProductoRequestDTO productoRequestDTO, 
    @RequestParam String vendedorId) {
        return vendedorService.agregarProducto(productoRequestDTO, vendedorId);
    }*/

    /* 
    @GetMapping("/obtener-vendedor-por-usuarioId")
    public ResponseEntity<VendedorResponseDTO> obtenerVendedorPorUsuarioId(@RequestParam String usuarioId) {
        return vendedorService.obtenerVendedorPorUsuarioId(usuarioId);
    }*/

    @PutMapping("/actualizar")
     @Operation(summary = "Actualiza el perfil de un vendedor logueado")
    public ResponseEntity<VendedorResponseDTO> updateVendedor(
            @RequestBody VendedorRequestDTO vendedorRequestDTO,
            Authentication authentication) { 
        
        String email = authentication.getName();
        
        return vendedorService.updateVendedor(vendedorRequestDTO, email);
    }

    //Endpoint HTTP desde ms-usuarios
    @PostMapping("/registrar")
    @Operation(summary = "Registra un nuevo vendedor. Llamado internamente por ms-usuarios")
    public ResponseEntity<Void> registrarVendedor(@RequestBody VendedorRegistradoEvent evento) {
            vendedorService.recibirRegistroVendedor(evento);
            return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/perfil")
    @Operation(summary = "Obtiene el perfil de un vendedor logueado")
    public ResponseEntity<VendedorResponseDTO> obtenerPerfil(Authentication authentication) {
       String usuarioIdentity = authentication.getName();
       return ResponseEntity.ok(vendedorService.buscarVendedorPorEmail(usuarioIdentity));
       
    }

    @GetMapping("/productos")
    @Operation(summary = "Obtiene los productos de un vendedor logueado")
    public List<ProductoResponseDTO> misProductos(Authentication authentication) {
        String email = authentication.getName();
        return vendedorService.listarProductos(email);
    }

    @PostMapping("/productos")
    @Operation(summary = "Agrega un producto a la lista de productos de un vendedor logueado")
    public ResponseEntity<ProductoResponseDTO> agregarProducto(
            Authentication authentication,
            @Valid @RequestBody ProductoRequestDTO request) {
        
        String email = authentication.getName();
        return ResponseEntity.ok(vendedorService.agregarProducto(email, request));
    }

    @PutMapping("/productos/{id}")
    @Operation(summary = "Modifica un producto de un vendedor logueado")
    public ResponseEntity<ProductoResponseDTO> editarProducto(
            Authentication authentication,
            @PathVariable String id,
            @Valid @RequestBody ProductoRequestDTO request) {
        
        String email = authentication.getName();
        return ResponseEntity.ok(vendedorService.editarProducto(email, id, request));
    }

    @DeleteMapping("/productos/{id}")
    @Operation(summary = "Baja lógica un producto de un vendedor logueado")
    public ResponseEntity<Void> eliminarProducto(
            Authentication authentication,
            @PathVariable String id) {
        
        String email = authentication.getName();
        vendedorService.eliminarProducto(email, id);
        
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/buscar/10-vendedores")
    @Operation(summary = "Obtiene los primeros 10 vendedores por provincia y localidad")
    public ResponseEntity<List<VendedorResponseBusquedaDTO>> obtenerVendedoresPorUbicacion(
            @RequestParam String provincia,
            @RequestParam String localidad) {

        String provinciaDecodificada = java.net.URLDecoder.decode(provincia, java.nio.charset.StandardCharsets.UTF_8);
        String localidadDecodificada = java.net.URLDecoder.decode(localidad, java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.ok(vendedorService.obtenerDiezVendedoresPorUbicacion(provinciaDecodificada, localidadDecodificada));
    }


    @GetMapping("/buscar/vendedores")
    @Operation(summary = "Busca en vendedores segun el campo filtro")
    public ResponseEntity<List<VendedorResponseBusquedaDTO>> buscarVendedores(
            @RequestParam String provincia,
            @RequestParam String localidad,
            @RequestParam(required = false) String filtro) {
        // Si filtro es null, le pasamos un String vacío para que tu Service no explote
        String filtroBusqueda = (filtro == null) ? "" : filtro;
        return ResponseEntity.ok(vendedorService.buscarVendedores(provincia, localidad, filtroBusqueda));
    } 
    @GetMapping("/buscar/productos")
    @Operation(summary = "Busca en productos segun el campo filtro")
    public ResponseEntity<List<ProductoResponseBusquedaDTO>> buscarProductos(
            @RequestParam String provincia,
            @RequestParam String localidad,
            @RequestParam(required = false) String filtro) {
        // Si filtro es null, le pasamos un String vacío para que tu Service no explote
        String filtroBusqueda = (filtro == null) ? "" : filtro;
        return ResponseEntity.ok(vendedorService.buscarProductos(provincia, localidad, filtroBusqueda));
    }

    @GetMapping("/perfil-publico/{vendedorId}")
    @Operation(summary = "Obtiene el perfil público de un vendedor por su ID")
    public ResponseEntity<VendedorResponsePublicDTO> obtenerPerfilPublico(@PathVariable String vendedorId) {
        return ResponseEntity.ok(vendedorService.buscarVendedorPorId(vendedorId));
    }

    @GetMapping("/id-usuario/{id}")
    @Operation(summary = "Obtiene el idUsuario (id del ms_usuarios) de un vendedor a partir del id del vendedor")
    public ResponseEntity<String> obtenerIdUsuarioPorVendedorId(@PathVariable String id) {
        return ResponseEntity.ok(vendedorService.obtenerIdUsuarioPorVendedorId(id));
    }

    @GetMapping("/email/{id}")
    @Operation(summary = "Obtiene el email de un vendedor a partir del id del vendedor")
    public ResponseEntity<String> obtenerEmailPorVendedorId(@PathVariable String id) {
        return ResponseEntity.ok(vendedorService.obtenerEmailPorVendedorId(id));
    }

    @GetMapping("/resumen/{id}")
    @Operation(summary = "Obtiene el nombre, logo, localidad y si realiza envios de un local por su ID. Llamado internamente por ms-pedido")
    public ResponseEntity<VendedorResumidoDTO> obtenerDatosVendedor(@PathVariable String id) {
        return ResponseEntity.ok(vendedorService.obtenerDatosVendedor(id));
    }

    @GetMapping("/buscar-id/{email}")
    @Operation(summary = "Obtiene el id del vendedor por su email. Llamado internamente por ms-pedido")
    public ResponseEntity<String> buscarIdPorEmail(@PathVariable String email) {
        String idVendedor = vendedorService.obtenerIdPorEmail(email);
        return ResponseEntity.ok(idVendedor);
    }

    @PatchMapping("/{id}/calificacion")
    @Operation(summary = "Actualiza la calificación promedio de un vendedor. Llamado internamente por ms-pedido")
    public ResponseEntity<Void> actualizarCalificacion(
            @PathVariable String id,
            @Valid @RequestBody CalificacionVendedorRequestDTO dto) {
        vendedorService.actualizarCalificacion(id, dto.getPuntuacion());
        return ResponseEntity.noContent().build();
    }



}
