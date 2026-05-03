package com.geotracker.dto;

import com.geotracker.entity.WorkSchedule;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Arrays;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkScheduleResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String workStartTime; // "HH:mm"
    private String workEndTime;   // "HH:mm"
    private List<String> workDays;
    private boolean active;

    public static WorkScheduleResponse fromEntity(WorkSchedule s) {
        List<String> days = Arrays.stream(s.getWorkDays().split(","))
            .map(String::trim)
            .filter(d -> !d.isEmpty())
            .toList();
        return new WorkScheduleResponse(
            s.getId(),
            s.getUser() != null ? s.getUser().getId() : null,
            s.getUser() != null ? s.getUser().getName() : null,
            s.getWorkStartTime().toString(),   // "HH:mm"
            s.getWorkEndTime().toString(),
            days,
            s.isActive()
        );
    }
}
