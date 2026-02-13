package com.backend.backend.useless.dto;

public class ParkingCandidateDto {
    private String parkingName;
    private Double latitude;
    private Double longitude;
    private Double distanceMeters;

    public ParkingCandidateDto() {
    }

    public ParkingCandidateDto(String parkingName, Double latitude, Double longitude, Double distanceMeters) {
        this.parkingName = parkingName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.distanceMeters = distanceMeters;
    }

    public String getParkingName() {
        return parkingName;
    }

    public void setParkingName(String parkingName) {
        this.parkingName = parkingName;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getDistanceMeters() {
        return distanceMeters;
    }

    public void setDistanceMeters(Double distanceMeters) {
        this.distanceMeters = distanceMeters;
    }
}
