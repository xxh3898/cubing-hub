package com.cubinghub;

import java.util.Arrays;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.WebApplicationType;

@SpringBootApplication
public class CubingHubApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(CubingHubApplication.class);

		if (isRankingRedisRebuildOneShot(args, System.getenv("RANKING_REDIS_REBUILD_MODE"))) {
			application.setWebApplicationType(WebApplicationType.NONE);
		}

		application.run(args);
	}

	static boolean isRankingRedisRebuildOneShot(String[] args, String environmentValue) {
		if ("oneshot".equalsIgnoreCase(environmentValue)) {
			return true;
		}

		return Arrays.stream(args)
				.anyMatch(argument -> "--ranking.redis.rebuild-mode=oneshot".equalsIgnoreCase(argument));
	}

}
