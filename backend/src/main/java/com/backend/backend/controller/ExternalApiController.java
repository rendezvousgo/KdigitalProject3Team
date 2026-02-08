package com.backend.backend.controller;

import com.backend.backend.service.ExternalApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ExternalApiController {
    private static final Logger log = LoggerFactory.getLogger(ExternalApiController.class);

    private final ExternalApiService externalApiService;

    public ExternalApiController(ExternalApiService externalApiService) {
        this.externalApiService = externalApiService;
    }

    @GetMapping("/directions")
    public Map<String, Object> getDirections(
            @RequestParam double originLat,
            @RequestParam double originLng,
            @RequestParam double destinationLat,
            @RequestParam double destinationLng,
            @RequestParam(defaultValue = "RECOMMEND") String priority
    ) {
        try {
            return externalApiService.getDirections(originLat, originLng, destinationLat, destinationLng, priority);
        } catch (IllegalStateException e) {
            String message = e.getMessage() == null ? "길찾기 실패" : e.getMessage();
            log.warn("Directions failed origin=({}, {}), destination=({}, {}), priority={}, reason={}",
                    originLat, originLng, destinationLat, destinationLng, priority, message);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, message, e);
        } catch (Exception e) {
            log.error("Directions unexpected error origin=({}, {}), destination=({}, {}), priority={}",
                    originLat, originLng, destinationLat, destinationLng, priority, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "길찾기 처리 중 서버 오류", e);
        }
    }

    @GetMapping("/parking-lots")
    public List<Map<String, Object>> getParkingLots(
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String subRegion,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "1000") int perPage
    ) {
        return externalApiService.getParkingLots(region, subRegion, page, perPage);
    }

    @GetMapping("/parking-lots/nearby")
    public List<Map<String, Object>> getNearbyParkingLots(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "1") double radiusKm,
            @RequestParam(required = false) String region
    ) {
        return externalApiService.findNearbyParkingLots(lat, lng, radiusKm, region);
    }

    @GetMapping("/places/search")
    public List<Map<String, Object>> searchPlaces(
            @RequestParam String keyword,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng
    ) {
        return externalApiService.searchPlaces(keyword, lat, lng);
    }

    @GetMapping("/no-parking-zones")
    public Map<String, Object> getNoParkingZones(
            @RequestParam(required = false) String ctprvnNm,
            @RequestParam(required = false) String signguNm,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "50") int numOfRows
    ) {
        return externalApiService.getNoParkingZones(ctprvnNm, signguNm, pageNo, numOfRows);
    }
}
