package com.seminario.ms_ia.exception;

import java.util.Map;

public class ValidationException extends RuntimeException{
    
    private final Map<String, String> errores;

    public ValidationException(Map<String, String> errores) {
        super("Errores de validación");
        this.errores = errores;
    }

    public Map<String, String> getErrores() {
        return errores;
    }
}
