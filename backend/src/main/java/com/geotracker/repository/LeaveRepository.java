package com.geotracker.repository;

import com.geotracker.entity.Leave;
import com.geotracker.entity.User;
import com.geotracker.dto.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRepository extends JpaRepository<Leave, Long> {

    List<Leave> findByUserOrderByCreatedAtDesc(User user);

    List<Leave> findByStatusOrderByCreatedAtDesc(LeaveStatus status);

    List<Leave> findByStatusNotOrderByCreatedAtDesc(LeaveStatus status);

    List<Leave> findByUserAndStartDateBetween(User user, LocalDate start, LocalDate end);
}
