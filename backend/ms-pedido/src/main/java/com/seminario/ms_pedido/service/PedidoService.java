package com.seminario.ms_pedido.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seminario.ms_pedido.client.CatalogoClient;
import com.seminario.ms_pedido.client.UsuarioClient;
import com.seminario.ms_pedido.dto.CalificacionVendedorRequestDTO;
import com.seminario.ms_pedido.dto.CarritoResponseDTO;
import com.seminario.ms_pedido.dto.ConfirmarEnvioRequestDTO;
import com.seminario.ms_pedido.dto.PedidoDetalleDTO;
import com.seminario.ms_pedido.dto.PedidoListadoDTO;
import com.seminario.ms_pedido.dto.PedidoPendienteCalificarDTO;
import com.seminario.ms_pedido.dto.PedidoResponseDTO;
import com.seminario.ms_pedido.dto.PedidoVendedorResponseDTO;
import com.seminario.ms_pedido.exception.RequestException;
import com.seminario.ms_pedido.mapper.ClienteMapper;
import com.seminario.ms_pedido.mapper.PedidoMapper;
import com.seminario.ms_pedido.model.Cliente;
import com.seminario.ms_pedido.model.DetallePedido;
import com.seminario.ms_pedido.model.Direccion;
import com.seminario.ms_pedido.model.EstadoPedido;
import com.seminario.ms_pedido.model.Pedido;
import com.seminario.ms_pedido.repository.PedidoRepository;
import com.seminario.ms_pedido.dto.VendedorResumidoDTO;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class PedidoService {
    private final PedidoRepository pedidoRepository;
    private final DireccionService direccionService; 
    private final CarritoService carritoService;
    private final ClienteService clienteService;
    private final PedidoMapper pedidoMapper;
    private final ClienteMapper clienteMapper;
    private final CatalogoClient catalogoClient;
    private final UsuarioClient usuarioClient;
    private final NotificacionService notificacionService;

    public BigDecimal calcularCostoEnvio(String idVendedor, String idDireccionCliente, Authentication authentication) {
        //Se busca el id del vendedor que pertenece a la base de datos de usuarios
        String idVendedorUsuario = catalogoClient.obtenerIdUsuarioPorVendedorId(idVendedor);
        System.out.println("ID Vendedor Usuario: " + idVendedorUsuario);

        Double distancia = usuarioClient.calcularDistanciaEntreDirecciones(idVendedorUsuario, idDireccionCliente);
        System.out.println("Distancia calculada: " + distancia);

        // Cálculo basado en precio por km
        // Costo base: $1000 + $350 por km
        BigDecimal costoBase = BigDecimal.valueOf(500);
        BigDecimal precioPorKm = BigDecimal.valueOf(350);
        
        BigDecimal costoEnvio = costoBase.add(
            BigDecimal.valueOf(distancia).multiply(precioPorKm)
        );

        return costoEnvio;
        
    }

    @Transactional
    public PedidoResponseDTO crearBorradorPedido(String vendedorId, Authentication auth) {
        String emailCliente = auth.getName();

        CarritoResponseDTO carrito = carritoService.obtenerCarritoPorVendedor(emailCliente, vendedorId);

        if (carrito.getItems().isEmpty()) {
            throw new RequestException("PED", 400, HttpStatus.BAD_REQUEST, "No se puede iniciar el checkout con un carrito vacío");
        }

        Cliente cliente = clienteService.obtenerClientePorEmail(emailCliente);

        // Buscamos o creamos el Pedido en PostgreSQL
        Pedido pedido = pedidoRepository
            .findByClienteIdAndVendedorIdAndEstado(cliente.getId(), vendedorId, EstadoPedido.PENDIENTE)
            .orElse(new Pedido());

        // 3. Mapeo de cabecera
        pedido.setClienteId(cliente.getId());
        pedido.setCliente(cliente);
        pedido.setVendedorId(vendedorId);
        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setFechaCreacion(LocalDateTime.now());
        pedido.setMontoTotalProductos(carrito.getMontoTotalProductos());
        pedido.setComisionApp(carrito.getComisionApp());

        // 4. Mapeo de ítems (de CarritoItem a DetallePedido)
        if (pedido.getDetalles() != null) {
            pedido.getDetalles().clear();
        } else {
            pedido.setDetalles(new ArrayList<>());
        }

        carrito.getItems().forEach(item -> {
            DetallePedido detalle = new DetallePedido();
            detalle.setIdProducto(item.getProductoId());
            detalle.setCantidad(item.getCantidad()); 
            detalle.setMontoUnitario(item.getMontoUnitario());
            detalle.setObservaciones(item.getObservaciones());
            detalle.setPedido(pedido); 
            pedido.getDetalles().add(detalle);
        });

        Pedido pedidoGuardado = pedidoRepository.save(pedido);

        return pedidoMapper.toResponseDTO(pedidoGuardado);
    }

    @Transactional
    public PedidoResponseDTO confirmarOActualizarEnvio(ConfirmarEnvioRequestDTO dto, Authentication auth) {
        String emailCliente = auth.getName();
        Cliente cliente = clienteService.obtenerClientePorEmail(emailCliente);
        
        // 1. Recuperar o crear borrador
        Pedido pedido = pedidoRepository
            .findByClienteIdAndVendedorIdAndEstado(cliente.getId(), dto.getVendedorId(), EstadoPedido.PENDIENTE)
            .orElse(new Pedido());

        if (pedido.getId() == null) {
            pedido.setEstado(EstadoPedido.PENDIENTE);
            pedido.setFechaCreacion(LocalDateTime.now());
            pedido.setClienteId(cliente.getId());
            pedido.setCliente(cliente);
            pedido.setVendedorId(dto.getVendedorId());
            
        }

        // 2. Vincular dirección 
        if ("ENVIO_A_DOMICILIO".equals(dto.getMetodoEnvio().name())) {
            if (dto.getIdDireccion() == null) {
                throw new RequestException("PED", 400, HttpStatus.BAD_REQUEST, "Debe seleccionar una dirección");
            }
            Direccion dir = direccionService.obtenerEntidadPorId(dto.getIdDireccion());
            pedido.setDireccion(dir);
            
            // Cálculo de costo real para envío
            BigDecimal costoEnvio = calcularCostoEnvio(dto.getVendedorId(), dto.getIdDireccion(), auth);
            pedido.setCostoEnvio(costoEnvio);
        } else {
            // Es RETIRO_EN_LOCAL
            pedido.setDireccion(null);
            pedido.setCostoEnvio(BigDecimal.ZERO);
        }

        pedido.setMetodoEnvio(dto.getMetodoEnvio());
   
        pedido.setMontoTotal(pedido.getMontoTotalProductos()
                .add(pedido.getComisionApp())
                .add(pedido.getCostoEnvio()));

        return pedidoMapper.toResponseDTO(pedidoRepository.save(pedido));
    }

    public List<PedidoListadoDTO> obtenerListadoPedidos(String emailCliente, String estado, String periodo) {
        Cliente cliente = clienteService.obtenerClientePorEmail(emailCliente);
        LocalDateTime fechaLimite = switch (periodo != null ? periodo : "") {
            case "SEMANA"  -> LocalDateTime.now().minusWeeks(1);
            case "15_DIAS" -> LocalDateTime.now().minusDays(15);
            case "1_MES"   -> LocalDateTime.now().minusMonths(1);
            case "3_MESES" -> LocalDateTime.now().minusMonths(3);
            case "6_MESES" -> LocalDateTime.now().minusMonths(6);
            default        -> null; // Si es vacío o no coincide, no filtra por fecha
        };
        System.out.println("antes de entrar a la base de datos");

        List<Pedido> pedidos = pedidoRepository.findByClienteId(cliente.getId());
        System.out.println("paso la busqueda en la base de datos ");
       //se filtra por estado si se proporcionó, y por fecha si se proporcionó
       return pedidos.stream()
            // Filtro 1: Siempre excluir PENDIENTE
            .filter(p -> p.getEstado() != EstadoPedido.PENDIENTE)
            
            // Filtro 2: Por Estado (si se proporcionó y no es vacío)
            .filter(p -> (estado == null || estado.isEmpty()) || 
                         p.getEstado().name().equalsIgnoreCase(estado))
            
            // Filtro 3: Por Fecha (si hay fecha límite calculada)
            .filter(p -> fechaLimite == null || p.getFechaCreacion().isAfter(fechaLimite))
            
            // Ordenar por fecha (más reciente primero)
            .sorted((p1, p2) -> p2.getFechaCreacion().compareTo(p1.getFechaCreacion()))
            
            // Convertir a DTO y enriquecer
           .map(pedidoMapper::toListadoDTO)
           .toList();
    }

    public PedidoResponseDTO obtenerPedidoPorId(String pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
            .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Pedido no encontrado"));
        return pedidoMapper.toResponseDTO(pedido);
    }

    @Transactional
    public void marcarComoPagado(String id) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Pedido no encontrado"));

        if (EstadoPedido.REALIZADO.equals(pedido.getEstado())) {
            log.info("Pedido {} ya estaba REALIZADO. Se omite reprocesar.", id);
            return;
        }
        
        pedido.setEstado(EstadoPedido.REALIZADO);
        pedidoRepository.save(pedido);

        try {
            String emailVendedor = catalogoClient.obtenerEmailPorVendedorId(pedido.getVendedorId());

            notificacionService.crearYEnviarNotificacion(
                emailVendedor,
                "¡Nuevo pedido recibido! #" + id,
                id
            );

            String emailCliente = pedido.getCliente().getEmail();
            String vendedorId = pedido.getVendedorId();

            carritoService.eliminarCarritoPorVendedorYCliente(emailCliente, vendedorId);
        } catch (Exception ex) {
            log.warn("Pedido {} pagado, pero fallo el post-procesamiento: {}", id, ex.getMessage());
        }

        log.info("Pedido {} pagado. Estado: REALIZADO", id);
        }

    public PedidoDetalleDTO obtenerDetallePedidoPorId(String pedidoId, String emailCliente) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Pedido no encontrado"));
        
        Cliente cliente = clienteService.obtenerClientePorEmail(emailCliente);
        if (!pedido.getClienteId().equals(cliente.getId())) {
            throw new RequestException("PED", 403, HttpStatus.FORBIDDEN, "No tiene permiso para ver este pedido");
        }
        //se sacan las direcciones que no son la misma que el pedido
        cliente.setDireccion(List.of(pedido.getDireccion() != null ? pedido.getDireccion() : new Direccion()));
        return pedidoMapper.toDetalleDTO(pedido, clienteMapper.toResponseDTO(cliente));
    }

    public Map<String, Long> obtenerContadoresVendedor(Authentication auth) {
        String emailVendedor = auth.getName();
        String vendedorId = catalogoClient.obtenerIdPorEmail(emailVendedor);
        
        LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
        LocalDateTime finDia = LocalDate.now().atTime(LocalTime.MAX); 

        Map<String, Long> contadores = new HashMap<>();
        
        contadores.put("pendientes", pedidoRepository.countByVendedorIdAndEstadoAndFechaCreacionBetween(
                vendedorId, EstadoPedido.REALIZADO, inicioDia, finDia));
                
        contadores.put("preparacion", pedidoRepository.countByVendedorIdAndEstadoAndFechaCreacionBetween(
                vendedorId, EstadoPedido.EN_PREPARACION, inicioDia, finDia));
                
        contadores.put("entregados", pedidoRepository.countByVendedorIdAndEstadoAndFechaCreacionBetween(
                vendedorId, EstadoPedido.ENTREGADO, inicioDia, finDia));
        
        return contadores;
    }

    public List<PedidoVendedorResponseDTO> listarPedidosVendedor(Authentication auth, LocalDate inicio, LocalDate fin, EstadoPedido estado) {
        String emailVendedor = auth.getName();
        String vendedorId = catalogoClient.obtenerIdPorEmail(emailVendedor);

        // Si no hay fechas, por defecto es HOY
        LocalDateTime start = (inicio != null) ? inicio.atStartOfDay() : LocalDate.now().atStartOfDay();
        LocalDateTime end = (fin != null) ? fin.atTime(LocalTime.MAX) : LocalDate.now().atTime(LocalTime.MAX);

        List<PedidoVendedorResponseDTO> pedidos;
        if (estado != null) {
            pedidos = pedidoRepository.findByVendedorIdAndEstadoAndFechaCreacionBetween(vendedorId, estado, start, end)
                    .stream().map(pedidoMapper::toVendedorResponseDTO).toList();
        } else {
            // Cuando no hay estado especificado, traer todos los pedidos excepto PENDIENTE
            pedidos = pedidoRepository.findByVendedorIdAndFechaCreacionBetween(vendedorId, start, end)
                    .stream()
                    .filter(p -> !EstadoPedido.PENDIENTE.equals(p.getEstado()))
                    .map(pedidoMapper::toVendedorResponseDTO)
                    .toList();
        }
        
        // Ordenar por fecha de creación descendente (más reciente primero)
        return pedidos.stream()
                .sorted((p1, p2) -> p2.getFechaCreacion().compareTo(p1.getFechaCreacion()))
                .toList();
    }

    @Transactional
    public PedidoResponseDTO actualizarEstado(String pedidoId, EstadoPedido nuevoEstado, Authentication auth) {
        String emailVendedor = auth.getName(); 
        String vendedorIdAutenticado = catalogoClient.obtenerIdPorEmail(emailVendedor);

        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Pedido no encontrado"));

        if (!pedido.getVendedorId().equals(vendedorIdAutenticado)) {
            throw new RequestException("PED", 403, HttpStatus.FORBIDDEN, "No tienes permiso para modificar este pedido");
        }

        pedido.setEstado(nuevoEstado);
        Pedido pedidoGuardado = pedidoRepository.save(pedido);

        notificacionService.crearYEnviarNotificacion(
            pedidoGuardado.getCliente().getEmail(), 
            "Tu pedido #" + pedidoId + " ahora está " + nuevoEstado, 
            pedidoId
        );
        
        return pedidoMapper.toResponseDTO(pedidoGuardado);
    }

   @Transactional
    public void calificarPedido(String pedidoId, Integer puntuacion, Authentication auth) {
        String emailCliente = auth.getName();
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Pedido no encontrado"));

        Cliente cliente = clienteService.obtenerClientePorEmail(emailCliente);
        if (!pedido.getClienteId().equals(cliente.getId())) {
            throw new RequestException("PED", 403, HttpStatus.FORBIDDEN, "No tiene permiso para calificar este pedido");
        }

        if (!EstadoPedido.ENTREGADO.equals(pedido.getEstado())) {
            throw new RequestException("PED", 400, HttpStatus.BAD_REQUEST, "Solo se pueden calificar pedidos entregados");
        }

        if (pedido.getPuntuacion() != null) {
            throw new RequestException("PED", 400, HttpStatus.BAD_REQUEST, "Este pedido ya fue calificado");
        }

        pedido.setPuntuacion(puntuacion);
        pedido.setFechaCalificacion(LocalDateTime.now());
        pedidoRepository.save(pedido);

        try {
            catalogoClient.actualizarCalificacionVendedor(
                pedido.getVendedorId(),
                new CalificacionVendedorRequestDTO(puntuacion)
            );
        } catch (Exception ex) {
            log.warn("Pedido {} calificado, pero fallo la actualización de calificación en ms-catalogo: {}", pedidoId, ex.getMessage());
        }
    }

    public List<PedidoPendienteCalificarDTO> obtenerPedidosPendientesDeCalificar(String emailCliente) {
        Cliente cliente = clienteService.obtenerClientePorEmail(emailCliente);
        List<Pedido> pedidos = pedidoRepository
                .findByClienteIdAndEstadoAndPuntuacionIsNull(cliente.getId(), EstadoPedido.ENTREGADO);

        return pedidos.stream()
                .map(p -> {
                    VendedorResumidoDTO vendedor = catalogoClient.obtenerDatosVendedor(p.getVendedorId());
                    return new PedidoPendienteCalificarDTO(
                            p.getId(),
                            p.getVendedorId(),
                            vendedor.getNombreNegocio(), 
                            p.getDetalles() != null ? p.getDetalles().size() : 0
                    );
                })
                .toList();
    }



}
