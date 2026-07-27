package com.seminario.ms_pago.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    // handle custom errors
    @ExceptionHandler(RequestException.class)
    public ResponseEntity<Map<String, Object>> handleRequestException(RequestException ex) {
        Map<String, Object> error = new HashMap<>();

        error.put("ms_code", ex.getMs_code());
        error.put("ly_code", ex.getLy_code());
        error.put("mensaje", ex.getMessage());
        error.put("status", ex.getStatus().value());

        return new ResponseEntity<>(error, ex.getStatus());
    }

    // handle validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> ValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("error", ex.getMessage());
        return ResponseEntity.badRequest().body(error);
    }
}
