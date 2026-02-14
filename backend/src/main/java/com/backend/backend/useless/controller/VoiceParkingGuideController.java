package com.backend.backend.useless.controller;

import com.backend.backend.useless.dto.VoiceGuideRequestDto;
import com.backend.backend.useless.dto.VoiceGuideResponseDto;
import com.backend.backend.useless.service.VoiceParkingGuideService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/voice-guide")
public class VoiceParkingGuideController {

    private final VoiceParkingGuideService voiceParkingGuideService;

    public VoiceParkingGuideController(VoiceParkingGuideService voiceParkingGuideService) {
        this.voiceParkingGuideService = voiceParkingGuideService;
    }

    @PostMapping("/parking")
    public ResponseEntity<VoiceGuideResponseDto> guideToNearestParking(@RequestBody VoiceGuideRequestDto requestDto) {
        VoiceGuideResponseDto responseDto = voiceParkingGuideService.guideToNearestParking(requestDto);
        return ResponseEntity.ok(responseDto);
    }
}
