package com.backend.backend.pas.dto;

public class ParkingStopCheckResponse {
    private boolean prohibited;
    private String roadAddress;

    public ParkingStopCheckResponse() {
    }

    public ParkingStopCheckResponse(boolean prohibited, String roadAddress) {
        this.prohibited = prohibited;
        this.roadAddress = roadAddress;
    }

    public boolean isProhibited() {
        return prohibited;
    }

    public void setProhibited(boolean prohibited) {
        this.prohibited = prohibited;
    }

    public String getRoadAddress() {
        return roadAddress;
    }

    public void setRoadAddress(String roadAddress) {
        this.roadAddress = roadAddress;
    }
}
