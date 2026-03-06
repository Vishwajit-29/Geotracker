package com.geotracker.dto;

import com.geotracker.entity.AttendanceRecord;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceResponse {
    private Long id;
    private Long userId;
    private String userName;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private Double checkInLatitude;
    private Double checkInLongitude;

    public static AttendanceResponse fromEntity(AttendanceRecord record) {
        return new AttendanceResponse(
            record.getId(),
            record.getUser().getId(),
            record.getUser().getName(),
            record.getCheckInTime(),
            record.getCheckOutTime(),
            record.getCheckInLatitude(),
            record.getCheckInLongitude()
        );
    }
}