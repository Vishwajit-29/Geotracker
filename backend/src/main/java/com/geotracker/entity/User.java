package com.geotracker.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Embedded
    private GeofenceData geofence;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Embeddable
    public static class GeofenceData {
        private Double centerLatitude;
        private Double centerLongitude;
        private Integer radius;
    }

    public enum Role {
        ADMIN, EMPLOYEE
    }
}