package com.seminario.ms_pago.exception;

import org.springframework.http.HttpStatus;

public class PagoServiceException extends RequestException {

    // el proveedor de pago (Mercado Pago) o el circuit breaker impiden la operación
    public PagoServiceException(String message) {
        super("MS-PAGO", 1, HttpStatus.SERVICE_UNAVAILABLE, message);
    }

    // datos de entrada inválidos para la lógica de negocio de pago
    public PagoServiceException(String message, int ly_code) {
        super("MS-PAGO", ly_code, HttpStatus.BAD_REQUEST, message);
    }
}