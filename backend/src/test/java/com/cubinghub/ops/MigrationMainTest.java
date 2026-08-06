package com.cubinghub.ops;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;

class MigrationMainTest {

    @Test
    void should_buildIsolatedFlywayConfiguration_when_requiredEnvironmentIsPresent() {
        MigrationMain.MigrationSettings settings =
                MigrationMain.MigrationSettings.from(Map.of(
                        "SPRING_DATASOURCE_URL", "jdbc:mysql://db:3306/cubing_hub",
                        "DB_USERNAME", "cubing_hub",
                        "DB_PASSWORD", "test-password"
                ));

        var configuration = MigrationMain.createFlyway(settings).getConfiguration();

        assertThat(settings.url()).isEqualTo("jdbc:mysql://db:3306/cubing_hub");
        assertThat(settings.username()).isEqualTo("cubing_hub");
        assertThat(configuration.isBaselineOnMigrate()).isTrue();
        assertThat(configuration.getBaselineVersion().getVersion()).isEqualTo("1");
        assertThat(configuration.getLocations())
                .extracting(Object::toString)
                .containsExactly("classpath:db/migration");
    }

    @Test
    void should_rejectMigrationStartup_when_requiredEnvironmentIsBlank() {
        Map<String, String> environment = Map.of(
                "SPRING_DATASOURCE_URL", "jdbc:mysql://db:3306/cubing_hub",
                "DB_USERNAME", "cubing_hub",
                "DB_PASSWORD", " "
        );

        assertThatThrownBy(() -> MigrationMain.MigrationSettings.from(environment))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("DB_PASSWORD");
    }
}
