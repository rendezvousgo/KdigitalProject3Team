package com.backend.backend.favorite.repository;

import com.backend.backend.favorite.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUsernameOrderByIdDesc(String username);
    boolean existsByUsernameAndParkingName(String username, String parkingName);
    void deleteByUsernameAndParkingName(String username, String parkingName);
}
