package com.geotracker.dto;

import com.geotracker.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String name;
    private String role;
    private GeofenceResponse geofence;

    public static UserResponse fromEntity(User user) {
        GeofenceResponse geofenceResponse = null;
        if (user.getGeofence() != null) {
            geofenceResponse = new GeofenceResponse(
                user.getGeofence().getCenterLatitude(),
                user.getGeofence().getCenterLongitude(),
                user.getGeofence().getRadius()
            );
        }
        return new UserResponse(user.getId(), user.getName(), user.getRole().name(), geofenceResponse);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeofenceResponse {
        private Double centerLatitude;
        private Double centerLongitude;
        private Integer radius;
    }
}