package com.backend.backend.service;

import com.backend.backend.dto.ParkingCandidateDto;

public interface PublicParkingApiService {
    ParkingCandidateDto findNearestParking(double userLatitude, double userLongitude);

    String findRegion1DepthName(double x, double y);
}

