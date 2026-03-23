package com.cubinghub;

import org.springframework.boot.SpringApplication;

public class TestCubingHubApplication {

	public static void main(String[] args) {
		SpringApplication.from(CubingHubApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
