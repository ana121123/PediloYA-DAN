package com.seminario.ms_pedido.service;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.seminario.ms_pedido.dto.ClienteRequestDTO;
import com.seminario.ms_pedido.dto.ClienteResponseDTO;
import com.seminario.ms_pedido.dto.eventos_ms_usuarios.ClienteRegistradoEvent;
import com.seminario.ms_pedido.exception.RequestException;
import com.seminario.ms_pedido.mapper.ClienteMapper;
import com.seminario.ms_pedido.model.Cliente;
import com.seminario.ms_pedido.model.EstadoDireccion;
import com.seminario.ms_pedido.repository.ClienteRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClienteService {
    private final ClienteRepository clienteRepository;
    private final ClienteMapper clienteMapper;
    private final UsuarioService usuarioService;
    
    public void registrarCliente(ClienteRegistradoEvent cliente) {
        Cliente clienteEntity = clienteMapper.toEntity(cliente);
        clienteRepository.save(clienteEntity);
    }

    public ClienteResponseDTO obtenerPerfilPorEmail(String email) {

    // Busca el cliente por email y las direcciones que no estén eliminadas lógicamente
        Cliente cliente = clienteRepository.findByEmail(email)
        .orElseThrow(() -> new RequestException("PE", 404, HttpStatus.NOT_FOUND, "Cliente no encontrado"));
        // Filtra la lista en una sola línea de forma segura
        cliente.getDireccion().removeIf(direccion -> EstadoDireccion.INACTIVO.equals(direccion.getEstado()));
        
        return clienteMapper.toResponseDTO(cliente);
    }

    public Cliente obtenerClientePorEmail(String email) {
        return clienteRepository.findByEmail(email)
                .orElseThrow(() -> new RequestException("PE", 404, HttpStatus.NOT_FOUND, "Cliente no encontrado"));
    }

    @Transactional
    public ResponseEntity<ClienteResponseDTO> updateCliente(ClienteRequestDTO clienteRequestDTO, String email) {
       
        Cliente cliente = clienteRepository.findByEmail(email)
                .orElseThrow(() -> new RequestException("PE", 3, HttpStatus.NOT_FOUND, "Cliente no encontrado"));

        // Actualiza los campos del cliente con los datos del DTO
        cliente.setNombre(clienteRequestDTO.getNombre());
        cliente.setApellido(clienteRequestDTO.getApellido());
        cliente.setTelefono(clienteRequestDTO.getTelefono());
        cliente.setFoto(clienteRequestDTO.getFoto());

        // Guarda los cambios en la base de datos
        Cliente updatedCliente = clienteRepository.save(cliente);
        
        //Se envía la actualización a ms-usuarios para que actualice telefono, nombre y apellido del usuario
        ClienteRequestDTO respuestaUsuario;
        try {
            respuestaUsuario = usuarioService.actualizarCliente(clienteRequestDTO);
        } catch (Exception e) {
            String error = e.getMessage();
            throw new RequestException("US",2, HttpStatus.BAD_REQUEST, error);
        }

        // Convierte la entidad actualizada a DTO y devuelve la respuesta
        ClienteResponseDTO responseDTO = clienteMapper.toResponseDTO(updatedCliente);
        return ResponseEntity.ok(responseDTO);
    }

}
