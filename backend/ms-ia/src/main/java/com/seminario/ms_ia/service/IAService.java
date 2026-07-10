package com.seminario.ms_ia.service;

import org.springframework.stereotype.Service;
import org.springframework.ai.chat.client.ChatClient; 
import org.springframework.stereotype.Service;

@Service
public class IAService {
    private final ChatClient chatClient;

    public IAService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String preguntar(String prompt){

        return chatClient.prompt(prompt)
                .call()
                .content();
    }
}