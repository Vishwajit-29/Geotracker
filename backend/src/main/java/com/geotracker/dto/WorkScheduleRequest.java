package com.geotracker.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkScheduleRequest {
    /** "HH:mm" — e.g. "09:00" */
    private String workStartTime;
    /** "HH:mm" — e.g. "18:00" */
    private String workEndTime;
    /** e.g. ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"] */
    private List<String> workDays;
    private boolean active = true;
}
