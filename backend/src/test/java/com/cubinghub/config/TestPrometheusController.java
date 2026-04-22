package com.cubinghub.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class TestPrometheusController {

    @GetMapping("/actuator/prometheus")
    String scrape() {
        return "prometheus";
    }
}
