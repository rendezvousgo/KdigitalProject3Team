package com.backend.backend.useless.dto;

public class VoiceGuideResponseDto {
    private String matchedIntent;
    private String navigationMessage;
    private ParkingCandidateDto targetParking;

    public VoiceGuideResponseDto() {
    }

    public VoiceGuideResponseDto(String matchedIntent, String navigationMessage, ParkingCandidateDto targetParking) {
        this.matchedIntent = matchedIntent;
        this.navigationMessage = navigationMessage;
        this.targetParking = targetParking;
    }

    public String getMatchedIntent() {
        return matchedIntent;
    }

    public void setMatchedIntent(String matchedIntent) {
        this.matchedIntent = matchedIntent;
    }

    public String getNavigationMessage() {
        return navigationMessage;
    }

    public void setNavigationMessage(String navigationMessage) {
        this.navigationMessage = navigationMessage;
    }

    public ParkingCandidateDto getTargetParking() {
        return targetParking;
    }

    public void setTargetParking(ParkingCandidateDto targetParking) {
        this.targetParking = targetParking;
    }
}
