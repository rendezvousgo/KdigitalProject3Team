package com.backend.backend.favorite.service;

import com.backend.backend.favorite.dto.FavoriteRequest;
import com.backend.backend.favorite.entity.Favorite;
import com.backend.backend.favorite.repository.FavoriteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class FavoriteService {

    @Autowired
    private FavoriteRepository favoriteRepository;

    public Favorite addFavorite(String username, FavoriteRequest request) {
        if (!StringUtils.hasText(username)) {
            throw new IllegalArgumentException("username required");
        }
        if (request == null || !StringUtils.hasText(request.getParkingName())) {
            throw new IllegalArgumentException("parkingName required");
        }
        if (favoriteRepository.existsByUsernameAndParkingName(username, request.getParkingName())) {
            return favoriteRepository.findByUsernameOrderByIdDesc(username)
                    .stream()
                    .filter(f -> request.getParkingName().equals(f.getParkingName()))
                    .findFirst()
                    .orElse(null);
        }
        Favorite favorite = new Favorite();
        favorite.setUsername(username);
        favorite.setParkingName(request.getParkingName());
        favorite.setLatitude(request.getLatitude());
        favorite.setLongitude(request.getLongitude());
        favorite.setAddress(request.getAddress());
        return favoriteRepository.save(favorite);
    }

    @Transactional
    public void removeFavorite(String username, String parkingName) {
        if (StringUtils.hasText(username) && StringUtils.hasText(parkingName)) {
            favoriteRepository.deleteByUsernameAndParkingName(username, parkingName);
        }
    }

    public List<Favorite> listFavorites(String username) {
        return favoriteRepository.findByUsernameOrderByIdDesc(username);
    }

    public boolean isFavorite(String username, String parkingName) {
        if (!StringUtils.hasText(username) || !StringUtils.hasText(parkingName)) {
            return false;
        }
        return favoriteRepository.existsByUsernameAndParkingName(username, parkingName);
    }
}
