package com.geotracker.repository;

import com.geotracker.entity.User;
import com.geotracker.entity.WorkSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {
    Optional<WorkSchedule> findByUser(User user);
    Optional<WorkSchedule> findByUserId(Long userId);
    boolean existsByUser(User user);
}
