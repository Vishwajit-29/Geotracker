package com.geotracker.controller;

import com.geotracker.dto.*;
import com.geotracker.entity.User;
import com.geotracker.repository.UserRepository;
import com.geotracker.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<AttendanceResponse>> getAllAttendance() {
        return ResponseEntity.ok(attendanceService.getAllAttendanceRecords());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AttendanceResponse>> getUserAttendance(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Use the username from authentication to get the actual user
        User user = userRepository.findByName(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(attendanceService.getUserAttendanceRecords(user));
    }

    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(
            @RequestBody CheckInRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Use the username from authentication to get the actual user
            User user = userRepository.findByName(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(attendanceService.checkIn(user, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkOut(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Use the username from authentication to get the actual user
            User user = userRepository.findByName(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(attendanceService.checkOut(user));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/summary/{year}/{month}")
    public ResponseEntity<?> getMonthlySummary(
            @PathVariable int year,
            @PathVariable int month,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userRepository.findByName(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(attendanceService.getMonthlyAttendanceSummary(user, year, month));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/summary/{userId}/{year}/{month}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getUserMonthlySummary(
            @PathVariable Long userId,
            @PathVariable int year,
            @PathVariable int month) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(attendanceService.getMonthlyAttendanceSummary(user, year, month));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
