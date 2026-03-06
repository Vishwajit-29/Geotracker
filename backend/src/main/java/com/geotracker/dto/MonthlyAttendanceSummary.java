package com.geotracker.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
public class MonthlyAttendanceSummary {

 private int year;
 private int month;
 private Map<String, Boolean> checkInDays; // date string "yyyy-MM-dd" -> has check-in
 private long totalWorkingMinutes; // in minutes
 private int totalDaysPresent;

 public static MonthlyAttendanceSummary create(
 int year,
 int month,
 Map<String, Boolean> checkInDays,
 long totalWorkingMinutes,
 int totalDaysPresent
 ) {
 return new MonthlyAttendanceSummary(year, month, checkInDays, totalWorkingMinutes, totalDaysPresent);
 }
}