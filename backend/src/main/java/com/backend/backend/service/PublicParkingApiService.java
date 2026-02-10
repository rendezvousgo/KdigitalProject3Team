package com.backend.backend.service;

import com.backend.backend.dto.ParkingCandidateDto;

public interface PublicParkingApiService {
    ParkingCandidateDto findNearestParking(double userLatitude, double userLongitude);
}

