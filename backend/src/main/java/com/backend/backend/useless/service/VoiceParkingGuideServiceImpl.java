package com.backend.backend.useless.service;

import org.springframework.stereotype.Service;

import com.backend.backend.useless.dto.ParkingCandidateDto;
import com.backend.backend.useless.dto.VoiceGuideRequestDto;
import com.backend.backend.useless.dto.VoiceGuideResponseDto;

@Service
public class VoiceParkingGuideServiceImpl implements VoiceParkingGuideService {

    private final PublicParkingApiService publicParkingApiService;

    public VoiceParkingGuideServiceImpl(PublicParkingApiService publicParkingApiService) {
        this.publicParkingApiService = publicParkingApiService;
    }

    @Override
    public VoiceGuideResponseDto guideToNearestParking(VoiceGuideRequestDto requestDto) {
        String transcript = requestDto.getTranscript() == null ? "" : requestDto.getTranscript();

        if (!containsParkingIntent(transcript)) {
            return new VoiceGuideResponseDto(
                    "UNKNOWN",
                    "주차 관련 요청으로 인식되지 않았습니다.",
                    null
            );
        }

        if (requestDto.getUserLatitude() == null || requestDto.getUserLongitude() == null) {
            return new VoiceGuideResponseDto(
                    "INVALID_REQUEST",
                    "위치 정보가 필요합니다.",
                    null
            );
        }

        try {
            ParkingCandidateDto nearestParking = publicParkingApiService.findNearestParking(
                    requestDto.getUserLatitude(),
                    requestDto.getUserLongitude()
            );

            if (nearestParking == null) {
                return new VoiceGuideResponseDto(
                        "NO_PARKING_FOUND",
                        "주변에 주차장을 찾지 못했습니다.",
                        null
                );
            }

            return new VoiceGuideResponseDto(
                    "PARKING_NAVIGATION",
                    "가장 가까운 주차장을 안내합니다.",
                    nearestParking
            );
        } catch (IllegalStateException e) {
            return new VoiceGuideResponseDto(
                    "PARKING_LOOKUP_FAILED",
                    "주차장 조회에 실패했습니다. 잠시 후 다시 시도하세요.",
                    null
            );
        }
    }

    private boolean containsParkingIntent(String transcript) {
        String t = transcript.toLowerCase();
        return t.contains("주차")
                || t.contains("주차장")
                || t.contains("parking")
                || t.contains("파킹")
                || t.contains("파크");
    }
}