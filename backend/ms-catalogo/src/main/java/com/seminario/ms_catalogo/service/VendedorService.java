package com.seminario.ms_catalogo.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seminario.ms_catalogo.dto.ProductoRequestDTO;
import com.seminario.ms_catalogo.dto.ProductoResponseBusquedaDTO;
import com.seminario.ms_catalogo.dto.ProductoResponseDTO;
import com.seminario.ms_catalogo.dto.VendedorRequestDTO;
import com.seminario.ms_catalogo.dto.VendedorResponseBusquedaDTO;
import com.seminario.ms_catalogo.dto.VendedorResponseDTO;
import com.seminario.ms_catalogo.dto.VendedorResponsePublicDTO;
import com.seminario.ms_catalogo.dto.VendedorResumidoDTO;
import com.seminario.ms_catalogo.dto.eventos_ms_usuarios.VendedorRegistradoEvent;
import com.seminario.ms_catalogo.exception.RequestException;
import com.seminario.ms_catalogo.exception.ValidationException;
import com.seminario.ms_catalogo.mapper.DireccionMapper;
import com.seminario.ms_catalogo.mapper.ProductoMapper;
import com.seminario.ms_catalogo.mapper.VendedorMapper;
import com.seminario.ms_catalogo.model.Categoria;
import com.seminario.ms_catalogo.model.Estado;
import com.seminario.ms_catalogo.model.Producto;
import com.seminario.ms_catalogo.model.Subcategoria;
import com.seminario.ms_catalogo.model.Vendedor;
import com.seminario.ms_catalogo.repository.VendedorRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;


@Service
@RequiredArgsConstructor
@Slf4j
public class VendedorService {
    @Autowired
    private final VendedorRepository vendedorRepository;
    @Autowired
    private final ProductoMapper productoMapper;
    private final DireccionMapper direccionMapper;
    private final VendedorMapper vendedorMapper;
    private final UsuarioService usuarioService;
    

    /*public VendedorResponseDTO updateVendedorConDatosLocales(Vendedor vendedor) {
        Vendedor vendedorGuardado = vendedorRepository.save(vendedor);
        return vendedorMapper.toDTO(vendedorGuardado);
    }*/

    /* 
    public ResponseEntity<ProductoResponseDTO> agregarProducto(ProductoRequestDTO productoRequestDTO, String vendedorId) {
        Vendedor vendedor = vendedorRepository.findByUsuarioId(vendedorId).orElse(null);
        if (vendedor == null) {
            throw new RequestException("CA", 2, HttpStatus.BAD_REQUEST, "Vendedor no encontrado");
        }
        Producto producto = productoMapper.toEntity(productoRequestDTO);
        vendedor.getProductos().add(producto);
        vendedorRepository.save(vendedor);
        return ResponseEntity.ok(productoMapper.toDTO(producto));
    }*/

    //Recibe el registro de vendedor desde ms-usuarios por HTTP sincrónico
    public void recibirRegistroVendedor(VendedorRegistradoEvent evento) {
            Vendedor vendedor = vendedorMapper.toNewEntity(evento);
            
            // Guardar vendedor en mongodb
            Vendedor vendedorGuardado = vendedorRepository.save(vendedor);
            
    }

    
   /* public Vendedor usuarioExistente(String usuarioId) {
        Vendedor vendedor = vendedorRepository.findByUsuarioId(usuarioId).orElse(null);
        if (vendedor == null) {
            //codigoo puesto al azar
            throw new RequestException("CA", 2, HttpStatus.BAD_REQUEST, "Vendedor no encontrado");
        }
        return vendedor;
    }*/

    public Vendedor usuarioExistente(String vendedorId) {
        return vendedorRepository.findById(vendedorId) 
            .orElseThrow(() -> new RequestException("CAT", 400, HttpStatus.BAD_REQUEST, "Vendedor no encontrado"));
    }

    /* 
    public ResponseEntity<VendedorResponseDTO> obtenerVendedorPorUsuarioId(String usuarioId) {
        Vendedor vendedor = vendedorRepository.findByUsuarioId(usuarioId).get();
        if (vendedor == null) {
            return ResponseEntity.notFound().build();
        }

        VendedorResponseDTO vendedorResponseDTO = vendedorMapper.toDTO(vendedor);
        return ResponseEntity.ok(vendedorResponseDTO);
    }*/

    
    public VendedorResponseDTO buscarVendedorPorEmail(String email) {
        Vendedor vendedor = vendedorRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No se encontró vendedor con email: " + email));
        
        return vendedorMapper.toDTO(vendedor);
    }

    @Transactional
    public ResponseEntity<VendedorResponseDTO> updateVendedor(VendedorRequestDTO dto, String email) {
        Vendedor vendedor = vendedorRepository.findByEmail(email)
                .orElseThrow(() -> new RequestException("CAT", 404, HttpStatus.NOT_FOUND, "Vendedor no encontrado"));

        Map<String, String> errores = new HashMap<>();

        // Validacion    
        if (Estado.ACTIVO.equals(vendedor.getEstado())) {
            errores = validarTodosLosCampos(dto);
        }
        else {
            errores = validarCamposBasicos(dto);
        }

        if (!errores.isEmpty()) {
            throw new ValidationException(errores);
        }

        // Preparar datos para el MS-Usuarios
        VendedorRegistradoEvent guardado = vendedorMapper.toVendedorRegistradoEvent(dto);
        guardado.setUsuarioId(vendedor.getUsuarioId());

        // Llamada HTTP al MS-Usuarios (Para Lat/Long)
        VendedorRegistradoEvent respuestaUsuario;
        try {
            // Asumiendo que usuarioClient devuelve VendedorRegistradoEvent
            respuestaUsuario = usuarioService.actualizarVendedor(guardado);
        } catch (Exception e) {
            String error = e.getMessage();
            throw new RequestException("US", 2, HttpStatus.BAD_REQUEST, error);
            //throw new RuntimeException("Error al comunicarse con Microservicio Usuarios: " + e.getMessage());
        }

        // Actualizar campos del Vendedor (Catalogo)
        vendedor.setNombreNegocio(dto.getNombreNegocio());
        vendedor.setTelefono(dto.getTelefono());
        vendedor.setNombreResponsable(dto.getNombreResponsable());
        vendedor.setApellidoResponsable(dto.getApellidoResponsable());
        vendedor.setHorarioApertura(dto.getHorarioApertura());
        vendedor.setHorarioCierre(dto.getHorarioCierre());
        vendedor.setTiempoEstimadoEspera(dto.getTiempoEstimadoEspera());
        vendedor.setRealizaEnvios(dto.getRealizaEnvios());
        vendedor.setLogo(dto.getLogo());
        vendedor.setBanner(dto.getBanner());

        // Actualizamos dirección con lo que devolvió MS-Usuarios (que incluye Lat/Long)
        if (respuestaUsuario != null && respuestaUsuario.getDireccion() != null) {
            vendedor.setDireccion(direccionMapper.toEntity(respuestaUsuario.getDireccion()));
        }

        // Lógica de Cambio de Estado (INCOMPLETO -> ACTIVO)
        if (Estado.INCOMPLETO.equals(vendedor.getEstado()) || vendedor.getEstado() == null) {
            if (esPerfilCompleto(vendedor)) {
                vendedor.setEstado(Estado.ACTIVO);
            }
    }

        // Guardar y Retornar
        vendedorRepository.save(vendedor);
        return ResponseEntity.ok(vendedorMapper.toDTO(vendedor));
    }

    private boolean hasText(String text) {
        return text != null && !text.trim().isEmpty();
    }

    private boolean esPerfilCompleto(Vendedor v) {
        return hasText(v.getNombreNegocio()) &&
               hasText(v.getTelefono()) &&
               hasText(v.getNombreResponsable()) &&
               hasText(v.getApellidoResponsable()) &&
               hasText(v.getHorarioApertura()) &&
               hasText(v.getHorarioCierre()) &&
               hasText(v.getTiempoEstimadoEspera()) &&
               v.getRealizaEnvios() != null && 
               v.getDireccion() != null &&
               hasText(v.getDireccion().getCalle()) &&
               hasText(v.getDireccion().getNumero()) &&
               hasText(v.getDireccion().getCodigoPostal()) &&
               v.getDireccion().getProvincia() != null && 
               v.getDireccion().getLocalidad() != null;
    }

    private Map<String, String> validarCamposBasicos(VendedorRequestDTO dto) {
        Map<String, String> errores = new HashMap<>();

        if (!hasText(dto.getNombreNegocio())) errores.put("nombreNegocio", "El nombre es obligatorio");
        if (!hasText(dto.getTelefono())) errores.put("telefono", "El teléfono es obligatorio");
        if (!hasText(dto.getNombreResponsable())) errores.put("nombreResponsable", "Responsable requerido");
        if (!hasText(dto.getApellidoResponsable())) errores.put("apellidoResponsable", "Apellido requerido");

        // Dirección siempre obligatoria para que el mapa funcione
        if (dto.getDireccion() != null) {
            if (!hasText(dto.getDireccion().getProvincia())) errores.put("provincia", "Falta provincia");
            if (!hasText(dto.getDireccion().getLocalidad())) errores.put("localidad", "Falta localidad");
            if (!hasText(dto.getDireccion().getCalle())) errores.put("calle", "Falta calle");
            if (!hasText(dto.getDireccion().getNumero())) errores.put("numero", "Falta altura");
            if (!hasText(dto.getDireccion().getCodigoPostal())) errores.put("codigoPostal", "Falta CP");
        } else {
            errores.put("direccion", "Dirección requerida");
        }
        
        return errores;
    }

    private Map<String, String> validarTodosLosCampos(VendedorRequestDTO dto) {
        // 1. Primero chequeamos que tenga lo básico
        Map<String, String> errores = validarCamposBasicos(dto);

        // 2. Sumamos las exigencias para ser ACTIVO
        if (!hasText(dto.getHorarioApertura())) errores.put("horarioApertura", "Requerido para estar Activo");
        if (!hasText(dto.getHorarioCierre())) errores.put("horarioCierre", "Requerido para estar Activo");
        if (!hasText(dto.getTiempoEstimadoEspera())) errores.put("tiempoEstimadoEspera", "Requerido para estar Activo");
        
        if (dto.getRealizaEnvios() == null) errores.put("realizaEnvios", "Debe definir envíos");

        return errores;
    }

    @Transactional(readOnly = true)
    public List<ProductoResponseDTO> listarProductos(String email) {
        Vendedor vendedor = vendedorRepository.findByEmail(email)
                .orElseThrow(() -> new RequestException("CAT", 404, HttpStatus.NOT_FOUND, "Vendedor no encontrado"));

        if (vendedor.getProductos() == null) {
            return new ArrayList<>();
        }

        return vendedor.getProductos().stream()
                .filter(p -> !Estado.INACTIVO.equals(p.getEstado()))
                .map(producto -> productoMapper.toDTO(producto))
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductoResponseDTO agregarProducto(String email, ProductoRequestDTO dto) {
        Vendedor vendedor = vendedorRepository.findByEmail(email)
                .orElseThrow(() -> new RequestException("CAT", 404, HttpStatus.NOT_FOUND, "Vendedor no encontrado"));

        Producto nuevoProducto = productoMapper.toEntity(dto);

        if (!nuevoProducto.getSubcategoria().esDeTipo(nuevoProducto.getCategoria())) {
             throw new RuntimeException("La subcategoría " + nuevoProducto.getSubcategoria() + 
                                        " no corresponde a la categoría " + nuevoProducto.getCategoria());
        }

        if (vendedor.getProductos() == null) {
            vendedor.setProductos(new ArrayList<>());
        }

        vendedor.getProductos().add(nuevoProducto);

        vendedorRepository.save(vendedor);

        return productoMapper.toDTO(nuevoProducto);
    }

    @Transactional
    public ProductoResponseDTO editarProducto(String email, String idProducto, ProductoRequestDTO dto) {
        Vendedor vendedor = vendedorRepository.findByEmail(email)
                .orElseThrow(() -> new RequestException("CAT", 404, HttpStatus.NOT_FOUND, "Vendedor no encontrado"));


        Producto producto = vendedor.getProductos().stream()
                .filter(p -> p.getId().equals(idProducto))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));


        Categoria catEnum = Categoria.valueOf(dto.getCategoria().toUpperCase());
        Subcategoria subEnum = Subcategoria.valueOf(dto.getSubcategoria().toUpperCase());

        if (!subEnum.getCategoriaPadre().equals(catEnum)) {
             throw new RuntimeException("La subcategoría " + dto.getSubcategoria() + 
                                        " no pertenece a la categoría " + dto.getCategoria());
        }

        productoMapper.updateEntity(producto, dto);

        vendedorRepository.save(vendedor);

        return productoMapper.toDTO(producto);
    }

    @Transactional
    public void eliminarProducto(String email, String idProducto) {
        Vendedor vendedor = vendedorRepository.findByEmail(email)
                .orElseThrow(() -> new RequestException("CAT", 404, HttpStatus.NOT_FOUND, "Vendedor no encontrado"));

        Producto producto = vendedor.getProductos().stream()
                .filter(p -> p.getId().equals(idProducto))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        producto.setEstado(Estado.INACTIVO);
        
        producto.setDisponible(false); 

        vendedorRepository.save(vendedor);
    }


    
   public List<Vendedor> obtenerVendedoresPorUbicacion(String provincia, String ciudad) {
    List<Vendedor> vendedores;
    
    // 1. Validaciones de ubicación
    if (provincia != null && ciudad != null) {
        vendedores = vendedorRepository.findByEstadoAndDireccion_ProvinciaAndDireccion_Localidad(Estado.ACTIVO, provincia, ciudad);
    } else {
        // Podrías cambiar estos throws por return new ArrayList<>() si prefieres no dar error 400
        String mensaje = (provincia == null && ciudad == null) ? "La provincia y localidad no pueden ser nulas" :
                         (provincia == null) ? "La provincia no puede ser nula" : "La localidad no puede ser nula";
        throw new RequestException("CA", 2, HttpStatus.BAD_REQUEST, mensaje);
    }

    // 2. Filtrado de Productos Activos y Vendedores con stock
    return vendedores.stream()
            .filter(v-> v.getProductos() != null && !v.getProductos().isEmpty() && Estado.ACTIVO.equals(v.getEstado())) // Solo vendedores con productos
            .peek(v -> {
                if (v.getProductos() != null) {
                    // Filtramos y convertimos explícitamente a ArrayList para evitar el error de la imagen
                    ArrayList<Producto> activos = v.getProductos().stream()
                            .filter(p -> Estado.ACTIVO.equals(p.getEstado()) && p.getDisponible()) // Solo productos activos y disponibles
                            .collect(Collectors.toCollection(ArrayList::new));
                    v.setProductos(activos); 
                }
            })
            .filter(v -> v.getProductos() != null && !v.getProductos().isEmpty() && Estado.ACTIVO.equals(v.getEstado()))
            .collect(Collectors.toList());
}

    public List<VendedorResponseBusquedaDTO> obtenerDiezVendedoresPorUbicacion(String provincia, String ciudad) {
        List<Vendedor> vendedores = obtenerVendedoresPorUbicacion(provincia, ciudad);
       
        return vendedores.stream()
                .limit(10)
                .map(v -> vendedorMapper.toBusquedaDTO(v))
                .collect(Collectors.toList());
    }

    public List<VendedorResponseBusquedaDTO> buscarVendedores(String provincia, String localidad, String filtro) {
        List<Vendedor> vendedores = obtenerVendedoresPorUbicacion(provincia, localidad);
        if (filtro == null || filtro.trim().isEmpty()) {
            return vendedores.stream()
                             .limit(10)
                             .map(vendedorMapper::toBusquedaDTO)
                             .collect(Collectors.toList());
        }
         // Convertir filtro a minúsculas para comparación case-insensitive
        String filtroLower = filtro.toLowerCase();
        return vendedores.stream()
        .filter(v -> {
            // A. Coincidencia en el nombre del negocio (Vendedor)
            boolean coincideVendedor = v.getNombreNegocio().toLowerCase().contains(filtroLower);
            
            // B. Coincidencia en cualquier atributo de sus productos
            boolean coincideProducto = v.getProductos().stream()
                .anyMatch(p -> 
                    p.getNombre().toLowerCase().contains(filtroLower) ||
                    p.getDescripcion().toLowerCase().contains(filtroLower) ||
                    p.getCategoria().name().toLowerCase().contains(filtroLower) ||
                    p.getSubcategoria().name().toLowerCase().contains(filtroLower)
                );

            // Si coincide cualquiera de las dos, el vendedor se incluye en el resultado
            return coincideVendedor || coincideProducto;
        })
        .map(vendedorMapper::toBusquedaDTO)
        .collect(Collectors.toList());
    }

    public List<ProductoResponseBusquedaDTO> buscarProductos(String provincia, String localidad, String filtro) {
    List<Vendedor> vendedores = obtenerVendedoresPorUbicacion(provincia, localidad);
    if (filtro == null || filtro.trim().isEmpty()) {
        return vendedores.stream()
                .flatMap(v -> v.getProductos().stream()
                    .filter(p -> !Estado.INACTIVO.equals(p.getEstado()))
                    .limit(5) // Por ejemplo, 5 productos por cada vendedor
                    .map(p -> productoMapper.toDTO(p, v.getId(), v.getNombreNegocio())))
                .limit(20) // Máximo 20 productos en total si no hay búsqueda
                .collect(Collectors.toList());
    }

    String filtroLower = filtro.toLowerCase();
    
    // Usamos LinkedHashSet para mantener el orden de inserción y evitar duplicados
    Set<ProductoResponseBusquedaDTO> productosOrdenados = new LinkedHashSet<>();

    // 1. Prioridad: Categoría
    agregarProductosPorCriterio(vendedores, productosOrdenados, filtroLower, "CATEGORIA");
    // 2. Prioridad: Subcategoría
    agregarProductosPorCriterio(vendedores, productosOrdenados, filtroLower, "SUBCATEGORIA");
    // 3. Prioridad: Nombre
    agregarProductosPorCriterio(vendedores, productosOrdenados, filtroLower, "NOMBRE");
    // 4. Prioridad: Descripción
    agregarProductosPorCriterio(vendedores, productosOrdenados, filtroLower, "DESCRIPCION");

    // Retorna la lista (estará vacía [] si no hubo coincidencias, sin lanzar error)
    return new ArrayList<>(productosOrdenados);
}

    // Método auxiliar para evitar repetir código y mantener la limpieza
    private void agregarProductosPorCriterio(List<Vendedor> vendedores, Set<ProductoResponseBusquedaDTO> set, String filtro, String criterio) {
        for (Vendedor v : vendedores) {
            if (v.getProductos() == null) continue;

            for (Producto p : v.getProductos()) {
                // 1. Validamos que no esté INACTIVO primero (sin borrarlo de la lista)
                if (Estado.INACTIVO.equals(p.getEstado()) && !p.getDisponible()) continue;

                boolean coincide = false;
                switch (criterio) {
                    case "CATEGORIA": coincide = p.getCategoria().name().toLowerCase().contains(filtro); break;
                    case "SUBCATEGORIA": coincide = p.getSubcategoria().name().toLowerCase().contains(filtro); break;
                    case "NOMBRE": coincide = p.getNombre().toLowerCase().contains(filtro); break;
                    case "DESCRIPCION": coincide = p.getDescripcion().toLowerCase().contains(filtro); break;
                }

                if (coincide) {
                    set.add(productoMapper.toDTO(p, v.getId(), v.getNombreNegocio()));
                }
            }
        }
    }


    public VendedorResponsePublicDTO buscarVendedorPorId(String vendedorId) {
        Vendedor vendedor = vendedorRepository.findById(vendedorId)
                .orElseThrow(() -> new RequestException("CA", 2, HttpStatus.BAD_REQUEST, "Vendedor no encontrado con ID: " + vendedorId));
        
        return vendedorMapper.toPublicDTO(vendedor);
    }


    public String obtenerIdUsuarioPorVendedorId(String id) {
        Vendedor vendedor = vendedorRepository.findById(id)
                .orElseThrow(() -> new RequestException("CA", 2, HttpStatus.BAD_REQUEST, "Vendedor no encontrado con ID: " + id));
        
        return vendedor.getUsuarioId();
    }

    public String obtenerEmailPorVendedorId(String id) {
        Vendedor vendedor = vendedorRepository.findById(id)
                .orElseThrow(() -> new RequestException("CA", 2, HttpStatus.BAD_REQUEST, "Vendedor no encontrado con ID: " + id));

        return vendedor.getEmail();
    }


    public VendedorResumidoDTO obtenerDatosVendedor(String id) {
        Vendedor vendedor = vendedorRepository.findById(id)
                .orElseThrow(() -> new RequestException("CA", 2, HttpStatus.BAD_REQUEST, "Vendedor no encontrado con ID: " + id));
        
        return VendedorResumidoDTO.builder()
            .nombreNegocio(vendedor.getNombreNegocio())
            .logoUrl(vendedor.getLogo())
            .realizaEnvios(vendedor.getRealizaEnvios())
            .Localidad(vendedor.getDireccion().getLocalidad())
            .build();  
    }

    public String obtenerIdPorEmail(String email) {
        return vendedorRepository.findByEmail(email)
                .map(vendedor -> vendedor.getId()) 
                .orElseThrow(() -> new RequestException("CA", 2, HttpStatus.BAD_REQUEST, "Vendedor no encontrado con email: " + email));
    }

    @Transactional
    public void actualizarCalificacion(String vendedorId, Integer puntuacion) {
        Vendedor vendedor = vendedorRepository.findById(vendedorId)
                .orElseThrow(() -> new RequestException("CA", 2, HttpStatus.BAD_REQUEST, "Vendedor no encontrado con ID: " + vendedorId));

        Integer cantidadActual = vendedor.getCantidadCalificaciones() != null ? vendedor.getCantidadCalificaciones() : 0;
        Double promedioActual = vendedor.getCalificacionPromedio() != null ? vendedor.getCalificacionPromedio() : 0.0;

        Integer nuevaCantidad = cantidadActual + 1;
        Double nuevoPromedio = ((promedioActual * cantidadActual) + puntuacion) / nuevaCantidad;

        vendedor.setCantidadCalificaciones(nuevaCantidad);
        vendedor.setCalificacionPromedio(nuevoPromedio);

        vendedorRepository.save(vendedor);
    }

}

