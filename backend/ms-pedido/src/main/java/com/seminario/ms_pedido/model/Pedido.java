package com.seminario.ms_pedido.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;


@AllArgsConstructor
@NoArgsConstructor
@Data
@Entity
@Table(name = "Pedido")
public class Pedido {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String clienteId;

    private String vendedorId;

    private LocalDateTime fechaCreacion;

    @Enumerated(EnumType.STRING)
    private EstadoPedido estado;

    private BigDecimal montoTotal;

    private BigDecimal montoTotalProductos;

    private BigDecimal costoEnvio; 

    private BigDecimal comisionApp;

    @Enumerated(EnumType.STRING)
    private TipoEnvio metodoEnvio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_direccion", referencedColumnName = "id", nullable = true)
    private Direccion direccion;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private List<DetallePedido> detalles;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_cliente", nullable = false)// this line specifies the foreign key column  idUsuario in the "direccion" table
    @ToString.Exclude // important to avoid circular references in toString() method
    private Cliente cliente;

    private Integer puntuacion; // 1 a 5, null = todavía no calificado

    private LocalDateTime fechaCalificacion;
}
