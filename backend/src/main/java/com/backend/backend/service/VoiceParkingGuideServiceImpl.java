package com.backend.backend.service;

import com.backend.backend.dto.ParkingCandidateDto;
import com.backend.backend.dto.VoiceGuideRequestDto;
import com.backend.backend.dto.VoiceGuideResponseDto;
import org.springframework.stereotype.Service;

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
                    "주차장 안내 의도를 인식하지 못했습니다.",
                    null
            );
        }

        if (requestDto.getUserLatitude() == null || requestDto.getUserLongitude() == null) {
            return new VoiceGuideResponseDto(
                    "INVALID_REQUEST",
                    "사용자 위치 좌표가 필요합니다.",
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
                        "주변 주차장 정보를 찾지 못했습니다.",
                        null
                );
            }

            return new VoiceGuideResponseDto(
                    "PARKING_NAVIGATION",
                    "가장 가까운 주차장으로 안내를 시작합니다.",
                    nearestParking
            );
        } catch (IllegalStateException e) {
            return new VoiceGuideResponseDto(
                    "PARKING_LOOKUP_FAILED",
                    "공공 API 조회에 실패했습니다. 설정 또는 네트워크를 확인해 주세요.",
                    null
            );
        }
    }

    //밑의 키워드가 포함되면 주차 안내 요청으로 인식함
    private boolean containsParkingIntent(String transcript) {
        return transcript.contains("주차장")
                || transcript.contains("주차")
                || transcript.contains("parking")
                || transcript.contains("파킹")
                || transcript.contains("주차할 곳")
                || transcript.contains("차 댈 곳")
                || transcript.contains("주차 자리")
                || transcript.contains("주차공간");
    }
}
