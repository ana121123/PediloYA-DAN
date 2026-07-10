package com.seminario.ms_ia.exception;

import org.springframework.http.HttpStatus;

public class IAServiceException extends RequestException{
    
    // el proveedor de IA falló, no respondió, timeout, etc.
    public IAServiceException(String message) {
        super("MS-IA", 1, HttpStatus.SERVICE_UNAVAILABLE, message);
    }

    // datos de entrada inválidos para la lógica de negocio (ej: nombre vacío)
    public IAServiceException(String message, int ly_code) {
        super("MS-IA", ly_code, HttpStatus.BAD_REQUEST, message);
    }
}
