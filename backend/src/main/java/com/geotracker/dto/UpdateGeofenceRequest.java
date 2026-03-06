package com.geotracker.dto;

import lombok.Data;

@Data
public class UpdateGeofenceRequest {
    private Double centerLatitude;
    private Double centerLongitude;
    private Integer radius;
}