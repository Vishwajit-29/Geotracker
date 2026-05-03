package com.geotracker.service;

import com.geotracker.dto.AttendanceResponse;
import com.geotracker.dto.CheckInRequest;
import com.geotracker.dto.MonthlyAttendanceSummary;
import com.geotracker.entity.AttendanceRecord;
import com.geotracker.entity.User;
import com.geotracker.entity.WorkSchedule;
import com.geotracker.repository.AttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final WorkScheduleService workScheduleService;

    private static final double DEFAULT_RADIUS = 1000.0;
    private static final double DEFAULT_CENTER_LAT = 21.012508072124326;
    private static final double DEFAULT_CENTER_LNG = 75.50259944788704;

    public List<AttendanceResponse> getAllAttendanceRecords() {
        return attendanceRepository.findAll().stream()
            .map(AttendanceResponse::fromEntity)
            .collect(Collectors.toList());
    }

    public List<AttendanceResponse> getUserAttendanceRecords(User user) {
        return attendanceRepository.findByUserOrderByCheckInTimeDesc(user).stream()
            .map(AttendanceResponse::fromEntity)
            .collect(Collectors.toList());
    }

    public MonthlyAttendanceSummary getMonthlyAttendanceSummary(User user, int year, int month) {
        // Frontend sends 0-indexed month (0-11), convert to 1-indexed (1-12) for LocalDate
        int actualMonth = month + 1;
        LocalDate startOfMonth = LocalDate.of(year, actualMonth, 1);
        LocalDate endOfMonth = startOfMonth.plusMonths(1).minusDays(1);

        LocalDateTime startDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endDateTime = endOfMonth.plusDays(1).atStartOfDay();

        List<AttendanceRecord> records = attendanceRepository.findByUserAndCheckInTimeBetween(
            user, startDateTime, endDateTime
        );

        Map<String, Boolean> checkInDays = new HashMap<>();
        long totalWorkingMinutes = 0;
        int totalDaysPresent = 0;

        for (AttendanceRecord record : records) {
            LocalDate date = record.getCheckInTime().toLocalDate();
            String dateKey = date.toString(); // "yyyy-MM-dd" format
 checkInDays.put(dateKey, true);

            if (record.getCheckOutTime() != null) {
                long minutes = ChronoUnit.MINUTES.between(
                    record.getCheckInTime(),
                    record.getCheckOutTime()
                );
                totalWorkingMinutes += minutes;
            }
        }

        // Count unique present days
        totalDaysPresent = (int) checkInDays.values().stream().filter(Boolean::booleanValue).count();

        return MonthlyAttendanceSummary.create(
            year, month, checkInDays, totalWorkingMinutes, totalDaysPresent
        );
    }

    @Transactional
    public AttendanceResponse checkIn(User user, CheckInRequest request) {
        // Enforce work schedule — reject check-in outside office hours
        validateWorkingHours(user);

        // Check if user already has open check-in
        if (attendanceRepository.findOpenCheckInByUserId(user.getId()).isPresent()) {
            throw new RuntimeException("User already checked in");
        }

        // Get geofence config (user specific or default)
        double centerLat, centerLng, radius;
        if (user.getGeofence() != null) {
            centerLat = user.getGeofence().getCenterLatitude();
            centerLng = user.getGeofence().getCenterLongitude();
            radius = user.getGeofence().getRadius();
        } else {
            centerLat = DEFAULT_CENTER_LAT;
            centerLng = DEFAULT_CENTER_LNG;
            radius = DEFAULT_RADIUS;
        }

        // Validate geofence
        double distance = calculateDistance(request.getLatitude(), request.getLongitude(), centerLat, centerLng);
        if (distance > radius) {
            throw new RuntimeException("Check-in failed: You are outside the designated work area. (" + Math.round(distance) + "m away)");
        }

        AttendanceRecord record = new AttendanceRecord();
        record.setUser(user);
        record.setCheckInTime(LocalDateTime.now());
        record.setCheckInLatitude(request.getLatitude());
        record.setCheckInLongitude(request.getLongitude());

        return AttendanceResponse.fromEntity(attendanceRepository.save(record));
    }

    @Transactional
    public AttendanceResponse checkOut(User user) {
        AttendanceRecord record = attendanceRepository.findOpenCheckInByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("No open check-in found"));

        record.setCheckOutTime(LocalDateTime.now());
        return AttendanceResponse.fromEntity(attendanceRepository.save(record));
    }

    /** Same as checkIn but marks the record as automatic. */
    @Transactional
    public AttendanceResponse checkInAutomatic(User user, CheckInRequest request) {
        // Enforce work schedule
        validateWorkingHours(user);

        if (attendanceRepository.findOpenCheckInByUserId(user.getId()).isPresent()) {
            throw new RuntimeException("User already checked in");
        }

        double centerLat, centerLng, radius;
        if (user.getGeofence() != null) {
            centerLat = user.getGeofence().getCenterLatitude();
            centerLng = user.getGeofence().getCenterLongitude();
            radius = user.getGeofence().getRadius();
        } else {
            centerLat = DEFAULT_CENTER_LAT;
            centerLng = DEFAULT_CENTER_LNG;
            radius = DEFAULT_RADIUS;
        }

        double distance = calculateDistance(request.getLatitude(), request.getLongitude(), centerLat, centerLng);
        if (distance > radius) {
            throw new RuntimeException("Auto check-in failed: outside geofence (" + Math.round(distance) + "m away)");
        }

        AttendanceRecord record = new AttendanceRecord();
        record.setUser(user);
        record.setCheckInTime(LocalDateTime.now());
        record.setCheckInLatitude(request.getLatitude());
        record.setCheckInLongitude(request.getLongitude());
        record.setAutomatic(true);

        return AttendanceResponse.fromEntity(attendanceRepository.save(record));
    }

    /** Same as checkOut but marks the record as automatic. */
    @Transactional
    public AttendanceResponse checkOutAutomatic(User user) {
        AttendanceRecord record = attendanceRepository.findOpenCheckInByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("No open check-in found"));

        record.setCheckOutTime(LocalDateTime.now());
        record.setAutomatic(true);
        return AttendanceResponse.fromEntity(attendanceRepository.save(record));
    }

    // Haversine formula to calculate distance in meters
    private double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371000; // Earth radius in meters
        double lat1Rad = Math.toRadians(lat1);
        double lat2Rad = Math.toRadians(lat2);
        double deltaLat = Math.toRadians(lat2 - lat1);
        double deltaLng = Math.toRadians(lng2 - lng1);

        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                   Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                   Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Validates that the current time falls within the user's work schedule.
     * Throws a descriptive RuntimeException if outside — this bubbles up as
     * a 400 Bad Request with the message shown to the employee.
     */
    private void validateWorkingHours(User user) {
        WorkSchedule schedule = workScheduleService.getEffectiveSchedule(user);
        if (!schedule.isActive()) return; // schedule disabled → no restriction

        LocalDateTime now = LocalDateTime.now();
        LocalTime nowTime = now.toLocalTime();
        DayOfWeek today = now.getDayOfWeek();

        // Check if today is a work day
        boolean isWorkDay = Arrays.stream(schedule.getWorkDays().split(","))
            .map(String::trim)
            .anyMatch(day -> day.equalsIgnoreCase(today.name()));

        if (!isWorkDay) {
            throw new RuntimeException(
                "Check-in not allowed: today (" + today.name().charAt(0)
                + today.name().substring(1).toLowerCase() + ") is not a work day. "
                + "Work days: " + schedule.getWorkDays().replace(",", ", ")
            );
        }

        // Check if within office hours
        LocalTime start = schedule.getWorkStartTime();
        LocalTime end   = schedule.getWorkEndTime();

        if (nowTime.isBefore(start)) {
            throw new RuntimeException(
                "Check-in not allowed: office hours start at "
                + start.toString() + ". Current time: " + nowTime.withSecond(0).withNano(0)
            );
        }
        if (!nowTime.isBefore(end)) {
            throw new RuntimeException(
                "Check-in not allowed: office hours ended at "
                + end.toString() + ". Current time: " + nowTime.withSecond(0).withNano(0)
            );
        }
    }
}