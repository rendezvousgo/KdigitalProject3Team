package com.backend.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "parking.api")
public class ParkingApiProperties {
    private String baseUrl = "https://api.odcloud.kr/api/15012890/v1/uddi:307f9654-f48f-49de-a2b8-b7909c7ae5fb";
    private String serviceKey = "";
    private int page = 1;
    private int perPage = 200;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getServiceKey() {
        return serviceKey;
    }

    public void setServiceKey(String serviceKey) {
        this.serviceKey = serviceKey;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getPerPage() {
        return perPage;
    }

    public void setPerPage(int perPage) {
        this.perPage = perPage;
    }
}

