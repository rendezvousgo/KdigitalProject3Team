package com.backend.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kakao.api")
public class KakaoApiProperties {
    private String baseUrl = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json";
    private String coord2AddressBaseUrl = "https://dapi.kakao.com/v2/local/geo/coord2address.json";
    private String restKey = "";

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getRestKey() {
        return restKey;
    }

    public void setRestKey(String restKey) {
        this.restKey = restKey;
    }

    public String getCoord2AddressBaseUrl() {
        return coord2AddressBaseUrl;
    }

    public void setCoord2AddressBaseUrl(String coord2AddressBaseUrl) {
        this.coord2AddressBaseUrl = coord2AddressBaseUrl;
    }
}
