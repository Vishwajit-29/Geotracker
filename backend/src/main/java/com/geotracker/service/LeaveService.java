package com.geotracker.service;

import com.geotracker.dto.CreateLeaveRequest;
import com.geotracker.dto.LeaveResponse;
import com.geotracker.dto.LeaveStatus;
import com.geotracker.entity.AttendanceRecord;
import com.geotracker.entity.Leave;
import com.geotracker.entity.User;
import com.geotracker.repository.AttendanceRepository;
import com.geotracker.repository.LeaveRepository;
import com.geotracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRepository leaveRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;

    public List<LeaveResponse> getAllLeaves() {
        return leaveRepository.findByStatusNotOrderByCreatedAtDesc(LeaveStatus.PENDING).stream()
            .map(LeaveResponse::fromEntity)
            .collect(Collectors.toList());
    }

    public List<LeaveResponse> getPendingLeaves() {
        return leaveRepository.findByStatusOrderByCreatedAtDesc(LeaveStatus.PENDING).stream()
            .map(LeaveResponse::fromEntity)
            .collect(Collectors.toList());
    }

    public List<LeaveResponse> getUserLeaves(User user) {
        return leaveRepository.findByUserOrderByCreatedAtDesc(user).stream()
            .map(LeaveResponse::fromEntity)
            .collect(Collectors.toList());
    }

    public List<Leave> getApprovedLeavesForUserInMonth(User user, int year, int month) {
        // Frontend sends 0-indexed month (0-11), convert to 1-indexed (1-12) for LocalDate
        int actualMonth = month + 1;
        LocalDate startOfMonth = LocalDate.of(year, actualMonth, 1);
        LocalDate endOfMonth = startOfMonth.plusMonths(1).minusDays(1);
        return leaveRepository.findByUserAndStartDateBetween(user, startOfMonth, endOfMonth).stream()
            .filter(leave -> leave.getStatus() == LeaveStatus.APPROVED)
            .collect(Collectors.toList());
    }

    @Transactional
    public LeaveResponse createLeave(User user, CreateLeaveRequest request) {
        // Validate dates
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new RuntimeException("Start date must be before or equal to end date");
        }

        // Check for overlapping approved leaves
        List<Leave> existingLeaves = leaveRepository.findByUserAndStartDateBetween(
            user,
            request.getStartDate().minusMonths(12), // Check for past leaves
            request.getEndDate()
        );

        for (Leave existing : existingLeaves) {
            if (existing.getStatus() == LeaveStatus.APPROVED) {
                if (!(request.getEndDate().isBefore(existing.getStartDate()) ||
                      request.getStartDate().isAfter(existing.getEndDate()))) {
                    throw new RuntimeException("Leave period overlaps with an approved leave");
                }
            }
        }

        // Check for requested leaves that are pending
        for (Leave pending : existingLeaves) {
            if (pending.getStatus() == LeaveStatus.PENDING) {
                if (!(request.getEndDate().isBefore(pending.getStartDate()) ||
                      request.getStartDate().isAfter(pending.getEndDate()))) {
                    throw new RuntimeException("Leave period overlaps with a pending leave request");
                }
            }
        }

        Leave leave = new Leave();
        leave.setUser(user);
        leave.setType(request.getType());
        leave.setStartDate(request.getStartDate());
        leave.setEndDate(request.getEndDate());
        leave.setReason(request.getReason());
        leave.setStatus(LeaveStatus.PENDING);

        return LeaveResponse.fromEntity(leaveRepository.save(leave));
    }

    @Transactional
    public LeaveResponse approveLeave(Long leaveId, User admin) {
        Leave leave = leaveRepository.findById(leaveId)
            .orElseThrow(() -> new RuntimeException("Leave not found"));

        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new RuntimeException("Leave is not in pending status");
        }

        leave.setStatus(LeaveStatus.APPROVED);
        leave.setApprovedBy(admin);
        leave.setApprovedAt(LocalDateTime.now());

        return LeaveResponse.fromEntity(leaveRepository.save(leave));
    }

    @Transactional
    public LeaveResponse rejectLeave(Long leaveId, User admin) {
        Leave leave = leaveRepository.findById(leaveId)
            .orElseThrow(() -> new RuntimeException("Leave not found"));

        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new RuntimeException("Leave is not in pending status");
        }

        leave.setStatus(LeaveStatus.REJECTED);
        leave.setApprovedBy(admin);
        leave.setApprovedAt(LocalDateTime.now());

        return LeaveResponse.fromEntity(leaveRepository.save(leave));
    }
}
