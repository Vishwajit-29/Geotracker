package com.geotracker.controller;

import com.geotracker.dto.*;
import com.geotracker.entity.User;
import com.geotracker.security.JwtService;
import com.geotracker.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        User user = userService.findByName(request.getName());

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).build();
        }

        String token = jwtService.generateToken(user.getName());
        return ResponseEntity.ok(new LoginResponse(token, UserResponse.fromEntity(user)));
    }

    @PostMapping("/register-admin")
    public ResponseEntity<UserResponse> registerAdmin(@RequestBody CreateUserRequest request) {
        User existing = userService.findByName(request.getName());
        if (existing != null) {
            return ResponseEntity.badRequest().build();
        }

        User user = new User();
        user.setName(request.getName());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.ADMIN);

        return ResponseEntity.ok(UserResponse.fromEntity(
            userService.getUserById(
                userService.createUser(request.getName(), request.getPassword()).getId()
            )
        ));
    }
}