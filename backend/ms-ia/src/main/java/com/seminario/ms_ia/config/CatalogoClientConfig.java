package com.seminario.ms_ia.config;

import java.util.Collections;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import com.seminario.ms_ia.client.CatalogoClient;

@Configuration
public class CatalogoClientConfig {
    
    @Value("${catalogo.ms.url:http://localhost:8081}")
    private String catalogoBaseUrl;

    @Bean
    public RestClient catalogoRestClient(RestTemplateHeaderInterceptor interceptor) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);

        return RestClient.builder()
                .baseUrl(catalogoBaseUrl)
                .requestFactory(factory)
                .requestInterceptor(interceptor)
                .build();
    }

    @Bean
    public CatalogoClient catalogoClient(RestClient catalogoRestClient) {
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(catalogoRestClient))
                .build();

        return factory.createClient(CatalogoClient.class);
    }
}
