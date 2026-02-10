package com.backend.backend.user;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class AuthController {

    public static final String SESSION_USER = "LOGIN_USER";

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    public UserDto register(@RequestBody AuthRequest req) {
        if (req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username required");
        }
        if (req.getPassword() == null || req.getPassword().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password required");
        }
        if (userRepository.findByUsername(req.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "username exists");
        }
        User user = new User();
        user.setUsername(req.getUsername().trim());
        user.setPasswordHash(encoder.encode(req.getPassword()));
        user.setRole("USER");
        user.setNickname(req.getNickname() != null ? req.getNickname().trim() : req.getUsername().trim());
        user.setEmail(req.getEmail() != null ? req.getEmail().trim() : "");
        return new UserDto(userRepository.save(user));
    }

    @PostMapping("/login")
    public UserDto login(@RequestBody AuthRequest req, HttpSession session) {
        User user = userRepository.findByUsername(req.getUsername()).orElse(null);
        if (user == null || !encoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }
        session.setAttribute(SESSION_USER, user.getUsername());
        session.setAttribute("ROLE", user.getRole());
        return new UserDto(user);
    }

    @PostMapping("/logout")
    public void logout(HttpSession session) {
        session.invalidate();
    }

    @GetMapping("/me")
    public UserDto me(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER);
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "not logged in");
        }
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "not logged in");
        }
        return new UserDto(user);
    }
}