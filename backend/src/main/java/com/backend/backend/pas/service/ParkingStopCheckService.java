package com.backend.backend.pas.service;

import com.backend.backend.config.KakaoApiProperties;
import com.backend.backend.config.ParkingStopApiProperties;
import com.backend.backend.pas.dto.ParkingStopCheckResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

@Service
public class ParkingStopCheckService {
    private final KakaoApiProperties kakaoApiProperties;
    private final ParkingStopApiProperties parkingStopApiProperties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ParkingStopCheckService(KakaoApiProperties kakaoApiProperties, ParkingStopApiProperties parkingStopApiProperties) {
        this.kakaoApiProperties = kakaoApiProperties;
        this.parkingStopApiProperties = parkingStopApiProperties;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    // Main entry: converts x/y to road address, then queries parking-stop API and returns boolean.
    public ParkingStopCheckResponse checkProhibited(double x, double y) {
        KakaoAddressInfo addressInfo = resolveAddressInfo(x, y);
        if (addressInfo == null || !StringUtils.hasText(addressInfo.roadAddressName)) {
            return new ParkingStopCheckResponse(false, null);
        }

        boolean prohibited = queryParkingStopApi(addressInfo);
        return new ParkingStopCheckResponse(prohibited, addressInfo.roadAddressName);
    }

    // Test helper: check by address fields without geocoding.
    public ParkingStopCheckResponse checkProhibitedByAddress(String ctprvnNm, String signguNm, String rdnmadr) {
        KakaoAddressInfo info = new KakaoAddressInfo();
        info.region1 = StringUtils.hasText(ctprvnNm) ? ctprvnNm.trim() : null;
        info.region2 = StringUtils.hasText(signguNm) ? signguNm.trim() : null;
        info.roadAddressName = StringUtils.hasText(rdnmadr) ? rdnmadr.trim() : null;
        // For test endpoint, honor raw rdnmadr even if it is not a typical road_name.
        info.roadName = StringUtils.hasText(rdnmadr) ? rdnmadr.trim() : null;

        boolean prohibited = queryParkingStopApi(info);
        return new ParkingStopCheckResponse(prohibited, info.roadAddressName);
    }

    // Kakao coord2address: x/y -> road_address/address + region info for better matching.
    private KakaoAddressInfo resolveAddressInfo(double x, double y) {
        if (!StringUtils.hasText(kakaoApiProperties.getRestKey())) {
            throw new IllegalStateException("kakao.api.rest-key is required.");
        }

        URI uri = UriComponentsBuilder
                .fromHttpUrl(kakaoApiProperties.getCoord2AddressBaseUrl())
                .queryParam("x", x)
                .queryParam("y", y)
                .build(true)
                .toUri();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoApiProperties.getRestKey());

            ResponseEntity<String> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );

            // Debug: log raw Kakao response
            System.out.println("[Kakao coord2address raw] " + response.getBody());

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode documents = root.path("documents");
            if (!documents.isArray() || documents.size() == 0) {
                return null;
            }

            JsonNode first = documents.get(0);
            JsonNode roadAddress = first.path("road_address");
            String roadAddressName = roadAddress.path("address_name").asText(null);
            String roadName = roadAddress.path("road_name").asText(null);
            String region1 = roadAddress.path("region_1depth_name").asText(null);
            String region2 = roadAddress.path("region_2depth_name").asText(null);

            // Fallback when road_address is missing: use address.address_name
            JsonNode address = first.path("address");
            String addressName = address.path("address_name").asText(null);
            String addrRegion1 = address.path("region_1depth_name").asText(null);
            String addrRegion2 = address.path("region_2depth_name").asText(null);

            KakaoAddressInfo info = new KakaoAddressInfo();
            info.roadAddressName = StringUtils.hasText(roadAddressName) ? roadAddressName.trim() : (StringUtils.hasText(addressName) ? addressName.trim() : null);
            info.roadName = StringUtils.hasText(roadName) ? roadName.trim() : null;
            info.region1 = StringUtils.hasText(region1) ? region1.trim() : (StringUtils.hasText(addrRegion1) ? addrRegion1.trim() : null);
            info.region2 = StringUtils.hasText(region2) ? region2.trim() : (StringUtils.hasText(addrRegion2) ? addrRegion2.trim() : null);

            return info;

        } catch (Exception e) {
            throw new IllegalStateException("Failed to fetch Kakao coord2address data.", e);
        }
    }

    // data.go.kr: query by region + road name (if available) and decide if any item exists.
    private boolean queryParkingStopApi(KakaoAddressInfo addressInfo) {
        if (!StringUtils.hasText(parkingStopApiProperties.getServiceKey())) {
            throw new IllegalStateException("parking.stop.api.service-key is required.");
        }

        String rdnmParam = resolveRoadName(addressInfo);
        String encodedRoad = StringUtils.hasText(rdnmParam) ? UriUtils.encode(rdnmParam, StandardCharsets.UTF_8) : null;
        String encodedRegion1 = StringUtils.hasText(addressInfo.region1) ? UriUtils.encode(addressInfo.region1, StandardCharsets.UTF_8) : null;
        String encodedRegion2 = StringUtils.hasText(addressInfo.region2) ? UriUtils.encode(addressInfo.region2, StandardCharsets.UTF_8) : null;

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(parkingStopApiProperties.getBaseUrl())
                .queryParam("serviceKey", parkingStopApiProperties.getServiceKey())
                .queryParam("pageNo", parkingStopApiProperties.getPageNo())
                .queryParam("numOfRows", parkingStopApiProperties.getNumOfRows())
                .queryParam("type", "JSON");

        if (StringUtils.hasText(encodedRegion1)) {
            builder.queryParam("ctprvnNm", encodedRegion1);
        }
        if (StringUtils.hasText(encodedRegion2)) {
            builder.queryParam("signguNm", encodedRegion2);
        }
        if (StringUtils.hasText(encodedRoad)) {
            builder.queryParam("rdnmadr", encodedRoad);
        }

        URI uri = builder.build(true).toUri();
        System.out.println("[ParkingStop url] " + uri);

        try {
            String body = restTemplate.getForObject(uri, String.class);
            // Debug: log raw parking-stop API response
            System.out.println("[ParkingStop raw] " + body);
            JsonNode root = objectMapper.readTree(body);
            JsonNode items = root.path("response").path("body").path("items");

            if (items.isMissingNode() || items.isNull()) {
                return false;
            }
            if (items.isArray()) {
                return items.size() > 0;
            }
            // Some APIs return a single object instead of array.
            return items.size() > 0 || items.fieldNames().hasNext();
        } catch (Exception e) {
            System.out.println("[ParkingStop error] " + e.getClass().getSimpleName() + ": " + e.getMessage());
            // If API fails, return false as requested.
            return false;
        }
    }

    private static class KakaoAddressInfo {
        private String roadAddressName;
        private String roadName;
        private String region1;
        private String region2;
    }

    // Prefer road_name; otherwise extract a road-like token (..로/..길/..대로) from address.
    private String resolveRoadName(KakaoAddressInfo addressInfo) {
        if (addressInfo == null) {
            return null;
        }
        if (StringUtils.hasText(addressInfo.roadName)) {
            return addressInfo.roadName.trim();
        }
        String source = StringUtils.hasText(addressInfo.roadAddressName) ? addressInfo.roadAddressName : null;
        if (!StringUtils.hasText(source)) {
            return null;
        }
        String[] tokens = source.split("\\s+");
        for (String token : tokens) {
            if (token.endsWith("로") || token.endsWith("길") || token.endsWith("대로")) {
                return token.trim();
            }
        }
        return null;
    }
}
