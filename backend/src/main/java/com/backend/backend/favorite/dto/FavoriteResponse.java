package com.backend.backend.favorite.dto;

import com.backend.backend.favorite.entity.Favorite;
import java.time.LocalDateTime;

public class FavoriteResponse {
    private Long id;
    private String username;
    private String parkingName;
    private Double latitude;
    private Double longitude;
    private String address;
    private LocalDateTime createdAt;

    public FavoriteResponse() {}

    public FavoriteResponse(Favorite favorite) {
        if (favorite != null) {
            this.id = favorite.getId();
            this.username = favorite.getUsername();
            this.parkingName = favorite.getParkingName();
            this.latitude = favorite.getLatitude();
            this.longitude = favorite.getLongitude();
            this.address = favorite.getAddress();
            this.createdAt = favorite.getCreatedAt();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getParkingName() { return parkingName; }
    public void setParkingName(String parkingName) { this.parkingName = parkingName; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
