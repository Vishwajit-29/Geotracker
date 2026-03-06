package com.geotracker.controller;

import com.geotracker.dto.CreateLeaveRequest;
import com.geotracker.dto.LeaveResponse;
import com.geotracker.entity.Leave;
import com.geotracker.entity.User;
import com.geotracker.repository.LeaveRepository;
import com.geotracker.repository.UserRepository;
import com.geotracker.service.LeaveService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<LeaveResponse>> getAllLeaves(
            @AuthenticationPrincipal UserDetails userDetails) {
        User admin = userRepository.findByName(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(leaveService.getAllLeaves());
    }

    @GetMapping("/pending")
    public ResponseEntity<List<LeaveResponse>> getPendingLeaves(
            @AuthenticationPrincipal UserDetails userDetails) {
        User admin = userRepository.findByName(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(leaveService.getPendingLeaves());
    }

    @GetMapping("/my")
    public ResponseEntity<List<LeaveResponse>> getMyLeaves(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByName(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(leaveService.getUserLeaves(user));
    }

    @PostMapping
    public ResponseEntity<?> createLeave(
            @RequestBody CreateLeaveRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userRepository.findByName(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(leaveService.createLeave(user, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveLeave(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User admin = userRepository.findByName(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            if (admin.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body("Only admin can approve leaves");
            }
            return ResponseEntity.ok(leaveService.approveLeave(id, admin));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectLeave(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User admin = userRepository.findByName(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            if (admin.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body("Only admin can reject leaves");
            }
            return ResponseEntity.ok(leaveService.rejectLeave(id, admin));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
