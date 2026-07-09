package com.seminario.ms_usuarios.service;

import java.util.List;
import java.util.Optional;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seminario.ms_usuarios.dto.eventos_ms_pedidio.ClienteActualizarDTO;
import com.seminario.ms_usuarios.model.Cliente;
import com.seminario.ms_usuarios.repository.ClienteRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClienteService {
    
    private final ClienteRepository clienteRepository;
    
    // Get all clients
    @Transactional(readOnly = true)
    public List<Cliente> listarClientes() {
        return clienteRepository.findAll();
    }

    // Find client by ID
    @Transactional(readOnly = true)
    public Optional<Cliente> buscarPorId(String id) {
        return clienteRepository.findById(id);
    }

    // Save client
    @Transactional
    public Cliente guardarCliente(Cliente cliente) {
        // check if the email already exists before save
        // put validations
        return clienteRepository.save(cliente);
    }

    // delete client
    @Transactional
    public void eliminarCliente(String id) {
        clienteRepository.deleteById(id);
    }

    @Transactional
    public @Nullable ClienteActualizarDTO actualizarCliente(ClienteActualizarDTO clienteActualizarDTO) {
        // Find the client by email
        Optional<Cliente> optionalCliente = clienteRepository.findByEmail(clienteActualizarDTO.getEmail());
        
        if (optionalCliente.isPresent()) {
            Cliente cliente = optionalCliente.get();
            // Update the fields
            cliente.setNombre(clienteActualizarDTO.getNombre());
            cliente.setApellido(clienteActualizarDTO.getApellido());
            cliente.setTelefono(clienteActualizarDTO.getTelefono());
            
            // Save the updated client
            clienteRepository.save(cliente);
            
            return clienteActualizarDTO;
        } else {
            // Handle the case where the client is not found
            return null; // or throw an exception, or return an error response
        }
    }

    
}
