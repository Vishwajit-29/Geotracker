package com.geotracker.service;

import com.geotracker.dto.*;
import com.geotracker.entity.User;
import com.geotracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
            .map(UserResponse::fromEntity)
            .collect(Collectors.toList());
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public UserResponse createUser(String name, String password) {
        if (userRepository.existsByName(name)) {
            throw new RuntimeException("User already exists");
        }
        User user = new User();
        user.setName(name);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(User.Role.EMPLOYEE);
        return UserResponse.fromEntity(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    @Transactional
    public UserResponse updateUserGeofence(Long userId, UpdateGeofenceRequest request) {
        User user = getUserById(userId);
        if (request.getCenterLatitude() != null && request.getCenterLongitude() != null && request.getRadius() != null) {
            User.GeofenceData geofence = new User.GeofenceData();
            geofence.setCenterLatitude(request.getCenterLatitude());
            geofence.setCenterLongitude(request.getCenterLongitude());
            geofence.setRadius(request.getRadius());
            user.setGeofence(geofence);
        } else {
            user.setGeofence(null);
        }
        return UserResponse.fromEntity(userRepository.save(user));
    }

    public User findByName(String name) {
        return userRepository.findByName(name).orElse(null);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = getUserById(userId);

        // Validate current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        // Validate new passwords match
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New passwords do not match");
        }

        // Validate new password is different from current
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new RuntimeException("New password must be different from current password");
        }

        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}