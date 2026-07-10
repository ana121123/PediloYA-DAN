package com.seminario.ms_ia.exception;

import org.springframework.http.HttpStatus;
import lombok.Data;

@Data
public class RequestException extends RuntimeException{
    private String ms_code; // microservice code that throws the error
    private int ly_code;    // code that identifies the layer that throws the error
    private HttpStatus status;

    public RequestException(String ms_code, int ly_code, HttpStatus status, String message) {
        super(message);
        this.ms_code = ms_code;
        this.ly_code = ly_code;
        this.status = status;
    }
}
