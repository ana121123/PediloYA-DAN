package com.seminario.ms_pedido.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.seminario.ms_pedido.model.EstadoPedido;
import com.seminario.ms_pedido.model.Pedido;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, String> {
    Optional<Pedido> findByClienteIdAndVendedorIdAndEstado(String clienteId, String vendedorId, EstadoPedido estado);

    int deleteByEstadoAndFechaCreacionBefore(EstadoPedido estado, LocalDateTime fecha);

    List<Pedido> findByClienteId(String clienteId);

    Optional<Pedido> findByIdAndClienteId(String pedidoId, String name);

   // long countByVendedorIdAndEstado(String vendedorId, EstadoPedido estado);

   long countByVendedorIdAndEstadoAndFechaCreacionBetween(
        String vendedorId, 
        EstadoPedido estado, 
        LocalDateTime inicio, 
        LocalDateTime fin
    );

    List<Pedido> findByVendedorIdAndFechaCreacionBetween(
        String vendedorId, 
        LocalDateTime inicio, 
        LocalDateTime fin
    );

    List<Pedido> findByVendedorIdAndEstadoAndFechaCreacionBetween(
        String vendedorId, 
        EstadoPedido estado, 
        LocalDateTime inicio, 
        LocalDateTime fin
    );

    List<Pedido> findByClienteIdAndEstadoAndPuntuacionIsNull(String clienteId, EstadoPedido estado);
}
    
