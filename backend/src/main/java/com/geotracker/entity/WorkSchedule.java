package com.geotracker.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_schedules")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * One schedule per employee (nullable = global default when userId is null).
     * Unique constraint ensures at most one schedule per user.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    /** Office start time, e.g. 09:00 */
    @Column(nullable = false)
    private LocalTime workStartTime;

    /** Office end time, e.g. 18:00 */
    @Column(nullable = false)
    private LocalTime workEndTime;

    /**
     * Comma-separated work days using java.time.DayOfWeek names:
     * "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
     */
    @Column(nullable = false, length = 100)
    private String workDays;

    /** Soft-disable without deleting */
    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
