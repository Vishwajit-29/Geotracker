package com.geotracker.config;

import com.geotracker.entity.User;
import com.geotracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Create admin user if not exists
        if (!userRepository.existsByName("admin")) {
            User admin = new User();
            admin.setName("admin");
            admin.setPassword(passwordEncoder.encode("pass"));
            admin.setRole(User.Role.ADMIN);
            userRepository.save(admin);
            log.info("Created default admin user");
        }

        // Create sample employees if not exist
        String[] employeeNames = {"Yash", "Lalit", "Tanisha", "Kartik", "Ajit", "Adesh", "Hrushikesh", "Bhavesh", "Deva", "Rupesh", "Dhiraj", "Shubham"};
        double centerLat = 21.012508072124326;
        double centerLng = 75.50259944788704;

        for (int i = 0; i < employeeNames.length; i++) {
            if (!userRepository.existsByName(employeeNames[i])) {
                User employee = new User();
                employee.setName(employeeNames[i]);
                employee.setPassword(passwordEncoder.encode("pass"));
                employee.setRole(User.Role.EMPLOYEE);

                // Set geofence with varying radii
                User.GeofenceData geofence = new User.GeofenceData();
                geofence.setCenterLatitude(centerLat);
                geofence.setCenterLongitude(centerLng);
                geofence.setRadius(150 + (i * 5)); // 150, 155, 160, ...
                employee.setGeofence(geofence);

                userRepository.save(employee);
            }
        }
        log.info("Database initialization complete");
    }
}