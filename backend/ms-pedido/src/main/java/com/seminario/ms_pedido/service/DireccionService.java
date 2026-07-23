package com.seminario.ms_pedido.service;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seminario.ms_pedido.dto.DireccionRequestDTO;
import com.seminario.ms_pedido.dto.DireccionResponseDTO;
import com.seminario.ms_pedido.exception.RequestException;
import com.seminario.ms_pedido.mapper.DireccionMapper;
import com.seminario.ms_pedido.model.Cliente;
import com.seminario.ms_pedido.model.Direccion;
import com.seminario.ms_pedido.model.EstadoDireccion;
import com.seminario.ms_pedido.repository.ClienteRepository;
import com.seminario.ms_pedido.repository.DireccionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;


@Service
@RequiredArgsConstructor
@Slf4j
public class DireccionService {
    private final DireccionRepository direccionRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioService usuarioService;
    private final DireccionMapper direccionMapper;
    private final ClienteService clienteService;

    @Transactional
    public DireccionResponseDTO agregarDireccion(String email, DireccionRequestDTO dto) {
       Cliente cliente = clienteService.obtenerClientePorEmail(email);
       
        String clienteId = cliente.getId();

        DireccionResponseDTO direccionValidada = usuarioService.buscarDatosDireccion(dto, clienteId);

        Direccion nuevaDireccion = direccionMapper.toEntity(direccionValidada);
       
        nuevaDireccion.setCliente(cliente);

        direccionRepository.save(nuevaDireccion);

        return direccionValidada;
    }

    @Transactional
    public void eliminarDireccion(String idDireccion, String email) {
        Cliente cliente = clienteService.obtenerClientePorEmail(email);
        
        Direccion direccion = direccionRepository.findByIdAndCliente(idDireccion, cliente)
                .orElseThrow(() -> new RequestException("PED", 404, HttpStatus.NOT_FOUND, "Dirección no encontrada"));
        
        if (!direccion.getCliente().getEmail().equals(email)) {
            throw new RequestException("PED", 403, HttpStatus.FORBIDDEN, "No tenés permiso para eliminar esta dirección");
        }

        try{
            usuarioService.eliminarDireccion(idDireccion);
            direccion.setEstado(EstadoDireccion.INACTIVO);
            direccionRepository.save(direccion);

        } catch(Exception e) {
            throw new RequestException("PED", 500, HttpStatus.INTERNAL_SERVER_ERROR, "Error al sincronizar la eliminación con el servicio de usuarios");
        }
        
    }

    public List<DireccionResponseDTO> filtrarPorLocalidad(String email, String localidadVendedor) {
        Cliente cliente = clienteService.obtenerClientePorEmail(email);

        List<Direccion> direcciones = direccionRepository.findActivasByClienteAndLocalidad(
                cliente.getId(), 
                localidadVendedor
        );

        return direcciones.stream()
            .map(direccionMapper::toResponseDTO)
            .toList();
    }
    
    public Direccion obtenerEntidadPorId(String id) {
        return direccionRepository.findById(id)
                .orElseThrow(() -> new RequestException("DIR", 404, HttpStatus.NOT_FOUND, "La dirección seleccionada no existe."));
    }


}
