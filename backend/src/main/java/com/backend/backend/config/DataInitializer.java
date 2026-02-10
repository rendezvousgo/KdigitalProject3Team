package com.backend.backend.config;

import com.backend.backend.board.entity.Category;
import com.backend.backend.board.repository.CategoryRepository;
import com.backend.backend.user.User;
import com.backend.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Arrays;

@Configuration
public class DataInitializer {

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Bean
    public CommandLineRunner initData(UserRepository userRepository, CategoryRepository categoryRepository) {
        return args -> {
            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

            if (userRepository.findByUsername(adminUsername).isEmpty()) {
                User admin = new User();
                admin.setUsername(adminUsername);
                admin.setPasswordHash(encoder.encode(adminPassword));
                admin.setRole("ADMIN");
                admin.setNickname("관리자");
                admin.setEmail("admin@safeparking.com");
                userRepository.save(admin);
            }

            String[] defaults = {"자유게시판", "주차 팁", "동네 소식", "질문/답변"};
            Arrays.stream(defaults).forEach(name -> {
                boolean exists = categoryRepository.findAll().stream().anyMatch(c -> c.getName().equals(name));
                if (!exists) {
                    Category c = new Category();
                    c.setName(name);
                    categoryRepository.save(c);
                }
            });
        };
    }
}