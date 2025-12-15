package com.cube.cube_server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class CubeServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(CubeServerApplication.class, args);
	}

}
