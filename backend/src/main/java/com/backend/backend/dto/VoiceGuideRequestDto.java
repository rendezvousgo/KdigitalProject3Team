package com.backend.backend.dto;

public class VoiceGuideRequestDto {
    private String transcript;
    private Double userLatitude;
    private Double userLongitude;

    public VoiceGuideRequestDto() {
    }

    public VoiceGuideRequestDto(String transcript, Double userLatitude, Double userLongitude) {
        this.transcript = transcript;
        this.userLatitude = userLatitude;
        this.userLongitude = userLongitude;
    }

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }

    public Double getUserLatitude() {
        return userLatitude;
    }

    public void setUserLatitude(Double userLatitude) {
        this.userLatitude = userLatitude;
    }

    public Double getUserLongitude() {
        return userLongitude;
    }

    public void setUserLongitude(Double userLongitude) {
        this.userLongitude = userLongitude;
    }
}
