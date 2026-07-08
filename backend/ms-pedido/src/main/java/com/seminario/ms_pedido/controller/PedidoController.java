package com.seminario.ms_pedido.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.seminario.ms_pedido.dto.CalificarPedidoRequestDTO;
import com.seminario.ms_pedido.dto.ConfirmarEnvioRequestDTO;
import com.seminario.ms_pedido.dto.PedidoDetalleDTO;
import com.seminario.ms_pedido.dto.PedidoListadoDTO;
import com.seminario.ms_pedido.dto.PedidoPendienteCalificarDTO;
import com.seminario.ms_pedido.dto.PedidoResponseDTO;
import com.seminario.ms_pedido.dto.PedidoVendedorResponseDTO;
import com.seminario.ms_pedido.model.EstadoPedido;
import com.seminario.ms_pedido.service.PedidoService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/pedidos")
@RequiredArgsConstructor
public class PedidoController {
    private final PedidoService pedidoService;

    @GetMapping("/costo-envio/{idVendedor}/{idDireccionCliente}")
    @Operation(summary = "Obtiene el costo de envio desde el local de un vendedor a la direccion del cliente")
    public ResponseEntity<BigDecimal> calcularDistanciaEntreDirecciones(
        @PathVariable("idVendedor") String idVendedor, 
        @PathVariable("idDireccionCliente") String idDireccionCliente, 
        Authentication authentication){
        return ResponseEntity.ok(pedidoService.calcularCostoEnvio(idVendedor, idDireccionCliente, authentication));
    }

    // CONTINUAR PASO 1: Se dispara al salir del Carrito hacia Direcciones
    @PostMapping("/iniciar-checkout/{vendedorId}")
    @Operation(summary = "Crea el pedido en estado PENDIENTE y copia los items del carrito")
    public ResponseEntity<PedidoResponseDTO> iniciarCheckout(
            @PathVariable String vendedorId,
            Authentication auth) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pedidoService.crearBorradorPedido(vendedorId, auth));
    }

    // CONTINUAR PASO 2: Se dispara al elegir dirección y querer ir a Datos del cliente
    @PatchMapping("/confirmar-envio")
    @Operation(summary = "Actualiza el pedido guardando la direccion y el costo de envio")
    public ResponseEntity<PedidoResponseDTO> confirmarEnvio(
            @RequestBody ConfirmarEnvioRequestDTO dto, 
            Authentication auth) {

        return ResponseEntity.ok(pedidoService.confirmarOActualizarEnvio(dto, auth));
    }

    @GetMapping("/listado-pedidos")
    @Operation(summary = "Listado de pedidos (con estado distinto de PENDIENTE) del cliente autenticado")
    public ResponseEntity<List<PedidoListadoDTO>> obtenerListadoPedidos(Authentication auth,
     @RequestParam(required = false) String filtroEstado, 
     @RequestParam(required = false) String filtroPeriodo) {
        // Si filtro es null, le pasamos un String vacío para que tu Service no explote
        String estado = (filtroEstado == null) ? "" : filtroEstado;
        String periodo = (filtroPeriodo == null) ? "" : filtroPeriodo;
        return ResponseEntity.ok(pedidoService.obtenerListadoPedidos(auth.getName(), estado, periodo));
    }

    @GetMapping("/{pedidoId}")
    @Operation(summary = "Obtiene los detalles de un pedido específico del cliente autenticado")    
    public ResponseEntity<PedidoResponseDTO> obtenerPedidoPorId(@PathVariable String pedidoId, Authentication auth) {
        return ResponseEntity.ok(pedidoService.obtenerPedidoPorId(pedidoId));
    }

    @PatchMapping("/{id}/confirmar-pago")
    @Operation(summary = "Webhook interno: ms-pago avisa que el pago fue exitoso")
    public ResponseEntity<Void> confirmarPago(@PathVariable String id) {
        pedidoService.marcarComoPagado(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/detalle-pedido/{pedidoId}")
    @Operation(summary = "Obtiene los detalles de un pedido específico del cliente autenticado")    
    public ResponseEntity<PedidoDetalleDTO> obtenerDetallePedidoPorId(@PathVariable String pedidoId, Authentication auth) {
        return ResponseEntity.ok(pedidoService.obtenerDetallePedidoPorId(pedidoId, auth.getName()));
    }

    @GetMapping("/vendedor/contadores")
    @PreAuthorize("hasRole('VENDEDOR')") 
    @Operation(summary = "Obtiene los contadores de un vendedor logueado")  
    public ResponseEntity<Map<String, Long>> getContadoresVendedor(Authentication auth) {
        Map<String, Long> stats = pedidoService.obtenerContadoresVendedor(auth);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/vendedor/listado")
    @PreAuthorize("hasRole('VENDEDOR')") 
    @Operation(summary = "Obtiene los pedidos de un vendedor con una fecha y estado determinado")  
    public ResponseEntity<List<PedidoVendedorResponseDTO>> listarParaVendedor(
        Authentication auth,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
        @RequestParam(required = false) EstadoPedido estado
    ) {
        return ResponseEntity.ok(pedidoService.listarPedidosVendedor(auth, fechaInicio, fechaFin, estado));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasRole('VENDEDOR')")
    @Operation(summary = "Permite a un vendedor actualizar el estado de un pedido")
    public ResponseEntity<PedidoResponseDTO> cambiarEstado(
        @PathVariable String id, 
        @RequestBody String nuevoEstado,
        Authentication auth 
    ) {
        String estadoLimpio = nuevoEstado.replace("\"", "").trim(); 
        EstadoPedido estadoEnum = EstadoPedido.valueOf(estadoLimpio);
        
        PedidoResponseDTO actualizado = pedidoService.actualizarEstado(id, estadoEnum, auth);
        return ResponseEntity.ok(actualizado);
    }

    @PatchMapping("/{id}/calificar")
    @Operation(summary = "Permite al cliente calificar un pedido entregado")
    public ResponseEntity<Void> calificarPedido(
            @PathVariable String id,
            @Valid @RequestBody CalificarPedidoRequestDTO dto,
            Authentication auth) {
        pedidoService.calificarPedido(id, dto.getPuntuacion(), auth);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/pendientes-calificar")
    @Operation(summary = "Obtiene los pedidos entregados que el cliente aún no calificó")
    public ResponseEntity<List<PedidoPendienteCalificarDTO>> obtenerPendientesCalificar(Authentication auth) {
        return ResponseEntity.ok(pedidoService.obtenerPedidosPendientesDeCalificar(auth.getName()));
    }
}

