package com.backend.backend.useless.service;

import com.backend.backend.useless.dto.ParkingCandidateDto;

public interface PublicParkingApiService {
    ParkingCandidateDto findNearestParking(double userLatitude, double userLongitude);

    String findRegion1DepthName(double x, double y);
}

