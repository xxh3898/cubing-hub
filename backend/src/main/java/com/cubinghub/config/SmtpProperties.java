package com.cubinghub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "smtp")
public class SmtpProperties {

    private String host = "";
    private int port = 587;
    private String username = "";
    private String password = "";
    private boolean auth = true;
    private boolean starttlsEnable = true;
    private String fromAddress = "";
    private long connectionTimeoutMs = 5000L;
    private long timeoutMs = 3000L;
    private long writeTimeoutMs = 5000L;
}
