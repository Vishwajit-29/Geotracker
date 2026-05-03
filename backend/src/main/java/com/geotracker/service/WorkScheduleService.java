package com.geotracker.service;

import com.geotracker.dto.WorkScheduleRequest;
import com.geotracker.dto.WorkScheduleResponse;
import com.geotracker.entity.User;
import com.geotracker.entity.WorkSchedule;
import com.geotracker.repository.UserRepository;
import com.geotracker.repository.WorkScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkScheduleService {

    private final WorkScheduleRepository scheduleRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    // ── Default schedule constants ────────────────────────────────────────────
    public static final LocalTime DEFAULT_START = LocalTime.of(9, 0);   // 09:00
    public static final LocalTime DEFAULT_END   = LocalTime.of(18, 0);  // 18:00
    public static final String    DEFAULT_DAYS  = "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY";

    // ── On startup: seed default schedule for every employee that lacks one ──
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initializeDefaultSchedules() {
        List<User> employees = userRepository.findAll().stream()
            .filter(u -> u.getRole() == User.Role.EMPLOYEE)
            .collect(Collectors.toList());

        int seeded = 0;
        for (User emp : employees) {
            if (scheduleRepository.findByUser(emp).isEmpty()) {
                assignDefaultSchedule(emp);
                seeded++;
            }
        }
        if (seeded > 0) {
            log.info("WorkScheduleService: seeded default 09:00-18:00 Mon-Fri for {} employee(s)", seeded);
        }
    }

    /**
     * Assign the default 09:00-18:00 Mon-Fri schedule to the given user.
     * Called on startup for existing employees and by UserService for new ones.
     */
    @Transactional
    public void assignDefaultSchedule(User user) {
        WorkSchedule schedule = scheduleRepository.findByUser(user).orElseGet(WorkSchedule::new);
        schedule.setUser(user);
        schedule.setWorkStartTime(DEFAULT_START);
        schedule.setWorkEndTime(DEFAULT_END);
        schedule.setWorkDays(DEFAULT_DAYS);
        schedule.setActive(true);
        scheduleRepository.save(schedule);
    }

    /**
     * Returns the actual WorkSchedule entity for a user — always non-null
     * because we seed defaults on startup. Falls back to a transient default
     * object if somehow missing.
     */
    public WorkSchedule getEffectiveSchedule(User user) {
        return scheduleRepository.findByUser(user).orElseGet(() -> {
            WorkSchedule fallback = new WorkSchedule();
            fallback.setWorkStartTime(DEFAULT_START);
            fallback.setWorkEndTime(DEFAULT_END);
            fallback.setWorkDays(DEFAULT_DAYS);
            fallback.setActive(true);
            return fallback;
        });
    }

    /** Get all schedules (admin view). */
    public List<WorkScheduleResponse> getAllSchedules() {
        return scheduleRepository.findAll().stream()
            .map(WorkScheduleResponse::fromEntity)
            .collect(Collectors.toList());
    }

    /** Get schedule for a specific user. */
    public WorkScheduleResponse getScheduleForUser(Long userId) {
        return scheduleRepository.findByUserId(userId)
            .map(WorkScheduleResponse::fromEntity)
            .orElse(null);
    }

    /** Get schedule for the authenticated user — returns default if none set. */
    public WorkScheduleResponse getMySchedule(String username) {
        User user = userRepository.findByName(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return WorkScheduleResponse.fromEntity(getEffectiveSchedule(user));
    }

    /**
     * Create or replace the schedule for a given user (admin only).
     * Upsert — safe to call multiple times.
     */
    @Transactional
    public WorkScheduleResponse setSchedule(Long userId, WorkScheduleRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        LocalTime start = LocalTime.parse(request.getWorkStartTime(), TIME_FMT);
        LocalTime end   = LocalTime.parse(request.getWorkEndTime(),   TIME_FMT);
        if (!end.isAfter(start)) throw new RuntimeException("Work end time must be after start time");
        if (request.getWorkDays() == null || request.getWorkDays().isEmpty())
            throw new RuntimeException("At least one work day must be selected");

        WorkSchedule schedule = scheduleRepository.findByUser(user).orElseGet(WorkSchedule::new);
        schedule.setUser(user);
        schedule.setWorkStartTime(start);
        schedule.setWorkEndTime(end);
        schedule.setWorkDays(String.join(",", request.getWorkDays()));
        schedule.setActive(request.isActive());

        return WorkScheduleResponse.fromEntity(scheduleRepository.save(schedule));
    }

    /** Remove schedule for a user. */
    @Transactional
    public void deleteSchedule(Long userId) {
        scheduleRepository.findByUserId(userId).ifPresent(scheduleRepository::delete);
    }
}

