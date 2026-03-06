package com.geotracker.dto;

import lombok.Data;

@Data
public class CreateUserRequest {
    private String name;
    private String password;
}