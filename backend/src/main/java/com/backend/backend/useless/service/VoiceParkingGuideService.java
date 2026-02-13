package com.backend.backend.useless.service;

import com.backend.backend.useless.dto.VoiceGuideRequestDto;
import com.backend.backend.useless.dto.VoiceGuideResponseDto;

public interface VoiceParkingGuideService {
    VoiceGuideResponseDto guideToNearestParking(VoiceGuideRequestDto requestDto);
}
