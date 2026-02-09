package com.backend.backend.service;

import com.backend.backend.dto.ParkingCandidateDto;
import com.backend.backend.dto.VoiceGuideRequestDto;
import com.backend.backend.dto.VoiceGuideResponseDto;
import org.springframework.stereotype.Service;

@Service
public class VoiceParkingGuideServiceImpl implements VoiceParkingGuideService {

    @Override
    public VoiceGuideResponseDto guideToNearestParking(VoiceGuideRequestDto requestDto) {
        String transcript = requestDto.getTranscript() == null ? "" : requestDto.getTranscript();

        if (!containsParkingIntent(transcript)) {
            return new VoiceGuideResponseDto(
                    "UNKNOWN",
                    "주차장 안내 의도를 인식하지 못했습니다.",
                    null
            );
        }

        // TODO: 실제 주차장 데이터 소스(DB/외부 API) 조회 후 최단거리 계산 로직으로 교체
        ParkingCandidateDto nearestParking = new ParkingCandidateDto(
                "샘플 주차장",
                requestDto.getUserLatitude(),
                requestDto.getUserLongitude(),
                0.0
        );

        return new VoiceGuideResponseDto(
                "PARKING_NAVIGATION",
                "가장 가까운 주차장으로 안내를 시작합니다.",
                nearestParking
        );
    }

    private boolean containsParkingIntent(String transcript) {
        return transcript.contains("주차장") || transcript.contains("주차") || transcript.contains("parking");
    }
}
