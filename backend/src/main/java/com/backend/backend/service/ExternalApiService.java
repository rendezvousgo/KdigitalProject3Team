package com.backend.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
public class ExternalApiService {
    private static final Logger log = LoggerFactory.getLogger(ExternalApiService.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${external.kakao.rest-api-key:}")
    private String kakaoRestApiKey;

    @Value("${external.kakao.ka-header:sdk/1.0 os/android origin/com.triceratops.safeparking}")
    private String kakaoKaHeader;

    @Value("${external.public-data.parking-api-key:}")
    private String parkingApiKey;

    @Value("${external.public-data.no-parking-api-key:}")
    private String noParkingApiKey;

    private static final String KAKAO_DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/directions";
    private static final String KAKAO_PLACE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
    private static final String PARKING_URL = "https://api.odcloud.kr/api/15050093/v1/uddi:d19c8e21-4445-43fe-b2a6-865dff832e08";
    private static final String NO_PARKING_URL = "http://api.data.go.kr/openapi/tn_pubr_public_prkstop_prhibt_area_api";

    public ExternalApiService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public Map<String, Object> getDirections(double originLat, double originLng, double destinationLat, double destinationLng, String priority) {
        String kaHeader = buildKaHeader();
        String url = UriComponentsBuilder.fromHttpUrl(KAKAO_DIRECTIONS_URL)
                .queryParam("origin", originLng + "," + originLat)
                .queryParam("destination", destinationLng + "," + destinationLat)
                .queryParam("priority", priority == null ? "RECOMMEND" : priority)
                .build(false)
                .toUriString();

        JsonNode response = requestJson(url, Map.of(
                "Authorization", "KakaoAK " + kakaoRestApiKey,
                "KA", kaHeader
        ));
        JsonNode route = response.path("routes").isArray() && response.path("routes").size() > 0
                ? response.path("routes").get(0)
                : null;

        if (route == null || route.path("result_code").asInt(-1) != 0) {
            int resultCode = route != null ? route.path("result_code").asInt(-1) : -1;
            String resultMsg = route != null ? route.path("result_msg").asText("Failed to get route") : "Failed to get route";
            log.warn("Kakao directions route error code={}, msg={}, ka={}", resultCode, resultMsg, kaHeader);
            String msg = "KAKAO_DIRECTIONS_ERROR code=" + resultCode + ", message=" + resultMsg;
            throw new IllegalStateException(msg);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("distance", route.path("summary").path("distance").asLong());
        result.put("duration", route.path("summary").path("duration").asLong());
        result.put("fare", objectMapper.convertValue(route.path("summary").path("fare"), Map.class));
        result.put("sections", objectMapper.convertValue(route.path("sections"), List.class));
        return result;
    }

    public List<Map<String, Object>> getParkingLots(String region, String subRegion, int page, int perPage) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(PARKING_URL)
                .queryParam("page", page)
                .queryParam("perPage", perPage)
                .queryParam("serviceKey", parkingApiKey);

        if (region != null && !region.isBlank()) {
            builder.queryParam("cond[지역구분::EQ]", region);
        }
        if (subRegion != null && !subRegion.isBlank()) {
            builder.queryParam("cond[지역구분_sub::EQ]", subRegion);
        }

        JsonNode response = requestJson(builder.build(false).toUriString(), Collections.emptyMap());
        List<Map<String, Object>> result = new ArrayList<>();

        for (JsonNode lot : response.path("data")) {
            Double lat = parseDouble(lot.path("위도").asText());
            Double lng = parseDouble(lot.path("경도").asText());
            if (lat == null || lng == null) continue;

            Map<String, Object> row = new HashMap<>();
            row.put("id", lot.path("주차장관리번호").asText(""));
            row.put("name", lot.path("주차장명").asText(""));
            row.put("address", firstNonBlank(
                    lot.path("주차장도로명주소").asText(null),
                    lot.path("주차장지번주소").asText(null)
            ));
            row.put("lat", lat);
            row.put("lng", lng);
            row.put("capacity", parseInt(lot.path("주차구획수").asText(), 0));
            row.put("fee", lot.path("요금정보").asText(""));
            row.put("weekdayHours", lot.path("평일운영시작시각").asText("?") + " ~ " + lot.path("평일운영종료시각").asText("?"));
            row.put("phone", lot.path("연락처").asText(""));
            result.add(row);
        }
        return result;
    }

    public List<Map<String, Object>> findNearbyParkingLots(double lat, double lng, double radiusKm, String region) {
        List<Map<String, Object>> lots = getParkingLots(region == null ? "서울특별시" : region, null, 1, 1000);
        return lots.stream()
                .map(lot -> {
                    double distance = calculateDistance(lat, lng, ((Number) lot.get("lat")).doubleValue(), ((Number) lot.get("lng")).doubleValue());
                    Map<String, Object> row = new HashMap<>(lot);
                    row.put("distance", distance);
                    return row;
                })
                .filter(lot -> ((Number) lot.get("distance")).doubleValue() <= radiusKm)
                .sorted(Comparator.comparingDouble(lot -> ((Number) lot.get("distance")).doubleValue()))
                .limit(20)
                .toList();
    }

    public List<Map<String, Object>> searchPlaces(String keyword, Double lat, Double lng) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(KAKAO_PLACE_URL)
                .queryParam("query", keyword)
                .queryParam("size", 15);

        if (lat != null && lng != null) {
            builder.queryParam("y", lat);
            builder.queryParam("x", lng);
            builder.queryParam("sort", "distance");
        }

        JsonNode response = requestJson(builder.build(false).toUriString(), Map.of("Authorization", "KakaoAK " + kakaoRestApiKey));
        List<Map<String, Object>> result = new ArrayList<>();

        for (JsonNode doc : response.path("documents")) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", doc.path("id").asText(""));
            row.put("name", doc.path("place_name").asText(""));
            row.put("address", firstNonBlank(doc.path("road_address_name").asText(null), doc.path("address_name").asText(null)));
            row.put("lat", parseDouble(doc.path("y").asText()));
            row.put("lng", parseDouble(doc.path("x").asText()));
            row.put("category", doc.path("category_group_name").asText(""));
            row.put("phone", doc.path("phone").asText(""));
            row.put("distance", parseInt(doc.path("distance").asText(), 0));
            row.put("type", "place");
            result.add(row);
        }
        return result;
    }

    public Map<String, Object> getNoParkingZones(String ctprvnNm, String signguNm, int pageNo, int numOfRows) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(NO_PARKING_URL)
                .queryParam("serviceKey", noParkingApiKey)
                .queryParam("pageNo", pageNo)
                .queryParam("numOfRows", numOfRows)
                .queryParam("type", "json");

        if (ctprvnNm != null && !ctprvnNm.isBlank()) {
            builder.queryParam("ctprvnNm", ctprvnNm);
        }
        if (signguNm != null && !signguNm.isBlank()) {
            builder.queryParam("signguNm", signguNm);
        }

        JsonNode response = requestJson(builder.build(false).toUriString(), Collections.emptyMap());
        return objectMapper.convertValue(response, Map.class);
    }

    private JsonNode requestJson(String url, Map<String, String> headers) {
        RestClient.RequestHeadersSpec<?> spec = restClient.get().uri(url);
        for (Map.Entry<String, String> e : headers.entrySet()) {
            spec = spec.header(e.getKey(), e.getValue());
        }
        String raw;
        try {
            raw = spec.retrieve().body(String.class);
        } catch (RestClientResponseException e) {
            log.warn("External API call failed status={}, url={}, responseBody={}",
                    e.getStatusCode().value(), url, e.getResponseBodyAsString());
            throw new IllegalStateException(
                    "EXTERNAL_API_HTTP_ERROR status=" + e.getStatusCode().value() + ", body=" + e.getResponseBodyAsString(),
                    e
            );
        } catch (Exception e) {
            log.warn("External API call failed url={}, reason={}", url, e.getMessage());
            throw new IllegalStateException("EXTERNAL_API_CALL_FAILED " + e.getMessage(), e);
        }

        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse external API response", e);
        }
    }

    private double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private Double parseDouble(String s) {
        try {
            if (s == null || s.isBlank()) return null;
            return Double.parseDouble(s);
        } catch (Exception e) {
            return null;
        }
    }

    private Integer parseInt(String s, int defaultValue) {
        try {
            if (s == null || s.isBlank()) return defaultValue;
            return Integer.parseInt(s);
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }

    private String buildKaHeader() {
        String ka = kakaoKaHeader == null ? "" : kakaoKaHeader.trim();
        if (!ka.contains("os/")) {
            ka = (ka + " os/android").trim();
        }
        if (!ka.contains("origin/")) {
            ka = (ka + " origin/com.triceratops.safeparking").trim();
        }
        return ka;
    }
}
