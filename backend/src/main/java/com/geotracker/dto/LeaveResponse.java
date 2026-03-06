package com.geotracker.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.geotracker.entity.Leave;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class LeaveResponse {

    private Long id;
    private Long userId;
    private String userName;
    private LeaveType type;
    private LeaveStatus status;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;
    private String reason;
    private Long approvedBy;
    private String approvedByName;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime approvedAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    public static LeaveResponse fromEntity(Leave leave) {
        return new LeaveResponse(
            leave.getId(),
            leave.getUser().getId(),
            leave.getUser().getName(),
            leave.getType(),
            leave.getStatus(),
            leave.getStartDate(),
            leave.getEndDate(),
            leave.getReason(),
            leave.getApprovedBy() != null ? leave.getApprovedBy().getId() : null,
            leave.getApprovedBy() != null ? leave.getApprovedBy().getName() : null,
            leave.getApprovedAt(),
            leave.getCreatedAt()
        );
    }
}
