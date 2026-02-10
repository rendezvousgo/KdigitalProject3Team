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

    // 怨듦났 二쇱감??API瑜??몄텧???ъ슜??醫뚰몴 湲곗? 媛??媛源뚯슫 二쇱감?μ쓣 李얠븘 諛섑솚?쒕떎.
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

                    String name = getTextByKeys(item, "二쇱감?λ챸", "parkingName", "pkltNm", "prkplceNm");
                    Double latitude = getDoubleByKeys(item, "?꾨룄", "lat", "latitude", "laCrdnt", "y");
                    Double longitude = getDoubleByKeys(item, "寃쎈룄", "lot", "longitude", "loCrdnt", "x");

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
            e.printStackTrace(); // ?ш린???쒕쾭 肄섏넄???먯씤 異쒕젰
            throw new IllegalStateException("Failed to fetch public parking data.", e);
        }

    }

    // ?묐떟 JSON?먯꽌 ?ㅼ젣 ?곗씠??諛곗뿴 ?꾨뱶紐?data/records/items)??李얠븘 諛섑솚?쒕떎.
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

    // ?щ윭 ???꾨낫 以??띿뒪??媛믪쓣 李얠븘 諛섑솚?쒕떎(?놁쑝硫?null).
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

    // ?щ윭 ???꾨낫 以??レ옄 媛믪쓣 李얠븘 Double濡?諛섑솚?쒕떎(?뚯떛 ?ㅽ뙣 ???ㅼ쓬 ???쒕룄).
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

    // ??醫뚰몴 媛꾩쓽 ??듭쟻??嫄곕━(誘명꽣)瑜?Haversine 怨듭떇?쇰줈 怨꾩궛?쒕떎.
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

