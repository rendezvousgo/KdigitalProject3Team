package com.backend.backend.pas.controller;

import com.backend.backend.pas.dto.ParkingStopCheckRequest;
import com.backend.backend.pas.dto.ParkingStopCheckResponse;
import com.backend.backend.pas.dto.ParkingStopCheckByAddressRequest;
import com.backend.backend.pas.service.ParkingStopCheckService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pas")
public class ParkingStopCheckController {
    private final ParkingStopCheckService parkingStopCheckService;

    public ParkingStopCheckController(ParkingStopCheckService parkingStopCheckService) {
        this.parkingStopCheckService = parkingStopCheckService;
    }

    // Receives x/y coordinates and returns prohibited boolean + road address.
    @PostMapping("/parking-stop-check")
    public ResponseEntity<ParkingStopCheckResponse> checkParkingStop(@RequestBody ParkingStopCheckRequest request) {
        System.out.println("[PAS] /parking-stop-check called");
        ParkingStopCheckResponse response = parkingStopCheckService.checkProhibited(request.getX(), request.getY());
        return ResponseEntity.ok(response);
    }

    // Test endpoint: checks by address fields without geocoding.
    @PostMapping("/parking-stop-check-by-address")
    public ResponseEntity<ParkingStopCheckResponse> checkParkingStopByAddress(@RequestBody ParkingStopCheckByAddressRequest request) {
        System.out.println("[PAS] /parking-stop-check-by-address called");
        ParkingStopCheckResponse response = parkingStopCheckService.checkProhibitedByAddress(
                request.getCtprvnNm(),
                request.getSignguNm(),
                request.getRdnmadr()
        );
        return ResponseEntity.ok(response);
    }
}
