package com.seminario.ms_ia.client;

import java.util.List;

import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import com.seminario.ms_ia.dto.ProductoCatalogoDTO;

@HttpExchange(url = "/catalogoMs")
public interface CatalogoClient {
    
    @GetExchange(url = "/api/vendedores/buscar/productos")
    List<ProductoCatalogoDTO> buscarProductos(
            @RequestParam String provincia,
            @RequestParam String localidad,
            @RequestParam(required = false) String filtro);
}
