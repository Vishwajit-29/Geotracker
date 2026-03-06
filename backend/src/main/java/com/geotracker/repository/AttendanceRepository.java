package com.geotracker.repository;

import com.geotracker.entity.AttendanceRecord;
import com.geotracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByUserOrderByCheckInTimeDesc(User user);

    @Query("SELECT a FROM AttendanceRecord a WHERE a.user.id = :userId AND a.checkOutTime IS NULL")
    Optional<AttendanceRecord> findOpenCheckInByUserId(Long userId);

    @Query("SELECT a FROM AttendanceRecord a WHERE a.user = :user AND a.checkInTime >= :start AND a.checkInTime < :end ORDER BY a.checkInTime DESC")
    List<AttendanceRecord> findByUserAndCheckInTimeBetween(User user, LocalDateTime start, LocalDateTime end);
}