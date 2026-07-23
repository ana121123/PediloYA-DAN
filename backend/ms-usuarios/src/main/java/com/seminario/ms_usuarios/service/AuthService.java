package com.seminario.ms_usuarios.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seminario.ms_usuarios.dto.ClienteRequestDTO;
import com.seminario.ms_usuarios.dto.ClienteResponseDTO;
import com.seminario.ms_usuarios.dto.DireccionResponseDTO;
import com.seminario.ms_usuarios.dto.LoginRequestDTO;
import com.seminario.ms_usuarios.dto.LoginResponseDTO;
import com.seminario.ms_usuarios.dto.VendedorRequestDTO;
import com.seminario.ms_usuarios.dto.VendedorResponseDTO;
import com.seminario.ms_usuarios.dto.eventos_ms_catalogo.VendedorRegistradoEvent;
import com.seminario.ms_usuarios.exception.RequestException;
import com.seminario.ms_usuarios.mapper.ClienteMapper;
import com.seminario.ms_usuarios.mapper.VendedorMapper;
import com.seminario.ms_usuarios.model.Cliente;
import com.seminario.ms_usuarios.model.EstadoUsuario;
import com.seminario.ms_usuarios.model.Usuario;
import com.seminario.ms_usuarios.model.Vendedor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UsuarioService usuarioService; 
    private final ClienteService clienteService; 
    private final VendedorService vendedorService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ClienteMapper clienteMapper;
    private final VendedorMapper vendedorMapper;
    private final DireccionService direccionService;
    private final CatalogoService catalogoService;
    private final PedidoService pedidoService;



    // --- LOGIN ---
    public LoginResponseDTO login(LoginRequestDTO loginRequest) {
        Usuario usuario = usuarioService.findByEmail(loginRequest.getEmail());

        if (!passwordEncoder.matches(loginRequest.getPassword(), usuario.getContraseña())) {
            throw new RequestException("US", 2, HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        if (usuario.getEstado() != EstadoUsuario.ACTIVO) {
            throw new RequestException("US", 2, HttpStatus.FORBIDDEN, "El usuario no está activo. Contacte al administrador.");
        }

        String token = jwtService.generateToken(usuario.getEmail(), usuario.getRol().name());

        return LoginResponseDTO.builder()
                .token(token)
                .rol(usuario.getRol().name()) 
                .build();
    }

    // --- REGISTRAR CLIENTE ---
    @Transactional
    public ClienteResponseDTO registrarCliente(ClienteRequestDTO dto) {
        
        if (usuarioService.existeEmail(dto.getEmail())) {
             throw new RequestException("US", 2, HttpStatus.CONFLICT, "Usuario ya registrado");
        }

        if (!dto.getPassword().equals(dto.getRepetirPassword())) {
            throw new RequestException("US", 2, HttpStatus.BAD_REQUEST, "Las contraseñas no coinciden");
        }

        Cliente nuevoCliente = clienteMapper.toEntity(dto);

        Cliente guardado = clienteService.guardarCliente(nuevoCliente);

        ClienteResponseDTO response = clienteMapper.toResponse(guardado);
        
        pedidoService.registrarCliente(clienteMapper.toClienteRegistrado(guardado));

        return response;
    }

    @Transactional
    public VendedorResponseDTO registrarVendedor(VendedorRequestDTO dto) {
        if (usuarioService.existeEmail(dto.getEmail())) {
             throw new RequestException("US", 2, HttpStatus.CONFLICT, "Usuario ya registrado");
        }

        if (!dto.getPassword().equals(dto.getRepetirPassword())) {
            throw new RequestException("US", 2, HttpStatus.BAD_REQUEST, "Las contraseñas no coinciden");
        }
        Vendedor nuevoVendedor = vendedorMapper.toEntity(dto);
       
        //guardar vendedor en postgres
        Vendedor vendedorGuardado = vendedorService.guardarVendedor(nuevoVendedor);

        DireccionResponseDTO direccionGuardada = direccionService.registrarDireccion(dto.getDireccion(), vendedorGuardado);

        // Registrar vendedor en ms-catalogo usando HTTP sincrónico
        VendedorRegistradoEvent evento = vendedorMapper.toVendedorRegistrado(vendedorGuardado, direccionGuardada);

        //mensaje a catalogo
        catalogoService.registrarVendedor(evento);

        return vendedorMapper.toResponse(vendedorGuardado, direccionGuardada); 
    }

}
