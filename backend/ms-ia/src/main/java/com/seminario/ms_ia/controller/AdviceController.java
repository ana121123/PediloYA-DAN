package com.seminario.ms_ia.controller;

import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.seminario.ms_ia.dto.ErrorDTO;
import com.seminario.ms_ia.exception.RequestException;

@RestControllerAdvice
public class AdviceController {
    @ExceptionHandler(value = RequestException.class)
    public ResponseEntity<ErrorDTO> requestExceptionHandler(RequestException ex) {
        ErrorDTO errorDTO = ErrorDTO.builder()
                .ms_code(ex.getMs_code())
                .error_code(ex.getLy_code())
                .message(ex.getMessage())
                .status(ex.getStatus())
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(errorDTO, errorDTO.getStatus());
    }

    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDTO> validationExceptionHandler(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Datos de entrada inválidos");

        ErrorDTO errorDTO = ErrorDTO.builder()
                .ms_code("MS-IA")
                .error_code(3)
                .message(message)
                .status(HttpStatus.BAD_REQUEST)
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(errorDTO, errorDTO.getStatus());
    }

    @ExceptionHandler(value = Exception.class)
    public ResponseEntity<ErrorDTO> genericExceptionHandler(Exception ex) {
        ErrorDTO errorDTO = ErrorDTO.builder()
                .ms_code("MS-IA")
                .error_code(99)
                .message("Ocurrió un error inesperado en el servicio de IA")
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(errorDTO, errorDTO.getStatus());
    }   
}
