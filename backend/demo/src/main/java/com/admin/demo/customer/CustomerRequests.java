package com.admin.demo.customer;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public final class CustomerRequests {

    private CustomerRequests() {
    }

    public record Create(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 160) String company,
            @NotBlank @Email @Size(max = 255) String email,
            @NotNull CustomerStatus status,
            @NotNull @PositiveOrZero BigDecimal value) {
    }

    public record ChangeStatus(@NotNull CustomerStatus status) {
    }
}

