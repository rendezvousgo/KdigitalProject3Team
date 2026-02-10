package com.backend.backend.service;

import com.backend.backend.config.ParkingApiProperties;
import com.backend.backend.dto.ParkingCandidateDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PublicParkingApiServiceImpl implements PublicParkingApiService {

    private final ParkingApiProperties parkingApiProperties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public PublicParkingApiServiceImpl(ParkingApiProperties parkingApiProperties) {
        this.parkingApiProperties = parkingApiProperties;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    // 공공 주차장 API를 호출해 사용자 좌표 기준 가장 가까운 주차장을 찾아 반환한다.
    @Override
    public ParkingCandidateDto findNearestParking(double userLatitude, double userLongitude) {
        System.out.println("Parking API baseUrl = " + parkingApiProperties.getBaseUrl());
        System.out.println("Parking API serviceKey present = " + StringUtils.hasText(parkingApiProperties.getServiceKey()));
        if (!StringUtils.hasText(parkingApiProperties.getServiceKey())) {
            throw new IllegalStateException("parking.api.service-key is required.");
        }

        URI uri = UriComponentsBuilder
                .fromHttpUrl(parkingApiProperties.getBaseUrl())
                .queryParam("serviceKey", parkingApiProperties.getServiceKey())
                .queryParam("page", parkingApiProperties.getPage())
                .queryParam("perPage", parkingApiProperties.getPerPage())
                .queryParam("returnType", "JSON")
                .build(true)
                .toUri();

        try {
            String body = restTemplate.getForObject(uri, String.class);

            JsonNode root = objectMapper.readTree(body);
            JsonNode dataArray = resolveDataArray(root);

            ParkingCandidateDto nearest = null;
            if (dataArray != null && dataArray.isArray()) {
                for (JsonNode item : dataArray) {

                    String name = getTextByKeys(item, "주차장명", "parkingName", "pkltNm", "prkplceNm");
                    Double latitude = getDoubleByKeys(item, "위도", "lat", "latitude", "laCrdnt", "y");
                    Double longitude = getDoubleByKeys(item, "경도", "lot", "longitude", "loCrdnt", "x");

                    if (!StringUtils.hasText(name) || latitude == null || longitude == null) {
                        continue;
                    }

                    double distance = calculateDistanceMeters(userLatitude, userLongitude, latitude, longitude);
                    if (nearest == null || distance < nearest.getDistanceMeters()) {
                        nearest = new ParkingCandidateDto(name, latitude, longitude, distance);
                    }
                }
            }

            return nearest;
        } catch (HttpClientErrorException e) {
            System.out.println("=== API ERROR RESPONSE ===");
            System.out.println(e.getResponseBodyAsString());
            e.printStackTrace();
            throw new IllegalStateException("Failed to fetch public parking data.", e);
        } catch (Exception e) {
            e.printStackTrace(); // 여기서 서버 콘솔에 원인 출력
            throw new IllegalStateException("Failed to fetch public parking data.", e);
        }

    }

    // 응답 JSON에서 실제 데이터 배열 필드명(data/records/items)을 찾아 반환한다.
    private JsonNode resolveDataArray(JsonNode root) {
        if (root == null) {
            return null;
        }
        if (root.has("data")) {
            return root.get("data");
        }
        if (root.has("records")) {
            return root.get("records");
        }
        if (root.has("items")) {
            return root.get("items");
        }
        return null;
    }

    // 여러 키 후보 중 텍스트 값을 찾아 반환한다(없으면 null).
    private String getTextByKeys(JsonNode node, String... keys) {
        for (String key : keys) {
            if (node.has(key) && !node.get(key).isNull()) {
                String value = node.get(key).asText();
                if (StringUtils.hasText(value)) {
                    return value.trim();
                }
            }
        }
        return null;
    }

    // 여러 키 후보 중 숫자 값을 찾아 Double로 반환한다(파싱 실패 시 다음 키 시도).
    private Double getDoubleByKeys(JsonNode node, String... keys) {
        for (String key : keys) {
            if (node.has(key) && !node.get(key).isNull()) {
                String raw = node.get(key).asText();
                if (!StringUtils.hasText(raw)) {
                    continue;
                }
                try {
                    return Double.parseDouble(raw.trim());
                } catch (NumberFormatException ignored) {
                    // try next key
                }
            }
        }
        return null;
    }

    // 두 좌표 간의 대략적인 거리(미터)를 Haversine 공식으로 계산한다.
    private double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double earthRadius = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                        * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }
}
