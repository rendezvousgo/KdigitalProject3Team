package com.backend.backend.favorite.controller;

import com.backend.backend.favorite.dto.FavoriteRequest;
import com.backend.backend.favorite.dto.FavoriteResponse;
import com.backend.backend.favorite.entity.Favorite;
import com.backend.backend.favorite.service.FavoriteService;
import com.backend.backend.user.AuthController;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/favorite")
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class FavoriteController {

    @Autowired
    private FavoriteService favoriteService;

    @PostMapping("/add")
    public FavoriteResponse add(@RequestBody FavoriteRequest request, HttpSession session) {
        String username = getLoginUser(session);
        Favorite favorite = favoriteService.addFavorite(username, request);
        return new FavoriteResponse(favorite);
    }

    @DeleteMapping("/remove")
    public void remove(@RequestParam("parkingName") String parkingName, HttpSession session) {
        String username = getLoginUser(session);
        favoriteService.removeFavorite(username, parkingName);
    }

    @GetMapping("/list")
    public List<FavoriteResponse> list(HttpSession session) {
        String username = getLoginUser(session);
        return favoriteService.listFavorites(username)
                .stream()
                .map(FavoriteResponse::new)
                .collect(Collectors.toList());
    }

    @GetMapping("/check")
    public boolean check(@RequestParam("parkingName") String parkingName, HttpSession session) {
        String username = getLoginUser(session);
        return favoriteService.isFavorite(username, parkingName);
    }

    private String getLoginUser(HttpSession session) {
        String username = (String) session.getAttribute(AuthController.SESSION_USER);
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "not logged in");
        }
        return username;
    }
}
