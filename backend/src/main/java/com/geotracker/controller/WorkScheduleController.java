package com.geotracker.controller;

import com.geotracker.dto.WorkScheduleRequest;
import com.geotracker.dto.WorkScheduleResponse;
import com.geotracker.service.WorkScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class WorkScheduleController {

    private final WorkScheduleService scheduleService;

    /** GET /api/schedule — all schedules (admin only) */
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<WorkScheduleResponse>> getAllSchedules() {
        return ResponseEntity.ok(scheduleService.getAllSchedules());
    }

    /** GET /api/schedule/me — current user's schedule */
    @GetMapping("/me")
    public ResponseEntity<?> getMySchedule(@AuthenticationPrincipal UserDetails userDetails) {
        WorkScheduleResponse schedule = scheduleService.getMySchedule(userDetails.getUsername());
        if (schedule == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(schedule);
    }

    /** GET /api/schedule/{userId} — specific user's schedule (admin only) */
    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getScheduleForUser(@PathVariable Long userId) {
        WorkScheduleResponse schedule = scheduleService.getScheduleForUser(userId);
        if (schedule == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(schedule);
    }

    /** POST /api/schedule/{userId} — set/update schedule (admin only) */
    @PostMapping("/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> setSchedule(
            @PathVariable Long userId,
            @RequestBody WorkScheduleRequest request) {
        try {
            return ResponseEntity.ok(scheduleService.setSchedule(userId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /** DELETE /api/schedule/{userId} — remove schedule (admin only) */
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> deleteSchedule(@PathVariable Long userId) {
        scheduleService.deleteSchedule(userId);
        return ResponseEntity.ok().build();
    }
}
