package com.backend.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.backend.backend.config.KakaoApiProperties;
import com.backend.backend.config.ParkingApiProperties;
import com.backend.backend.config.ParkingStopApiProperties;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableConfigurationProperties({ParkingApiProperties.class, KakaoApiProperties.class, ParkingStopApiProperties.class})
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}
