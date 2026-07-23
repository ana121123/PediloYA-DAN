package com.seminario.ms_pago.dto.eventos_kafka;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagoConfirmadoEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private String pedidoId;
    private String transactionId;
    private String correlationId;
}
