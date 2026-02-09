package com.backend.backend.service;

import com.backend.backend.dto.VoiceGuideRequestDto;
import com.backend.backend.dto.VoiceGuideResponseDto;

public interface VoiceParkingGuideService {
    VoiceGuideResponseDto guideToNearestParking(VoiceGuideRequestDto requestDto);
}
