package com.seminario.ms_ia.dto;

import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorDTO {
    private String ms_code;
    private int error_code;
    private String message;
    private HttpStatus status;
    private LocalDateTime timestamp;
}
