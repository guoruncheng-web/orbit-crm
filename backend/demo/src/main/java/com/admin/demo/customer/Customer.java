package com.admin.demo.customer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "customers")
public class Customer {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String company;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CustomerStatus status;

    @Column(nullable = false)
    private BigDecimal value;

    @Column(name = "last_contact", nullable = false)
    private LocalDate lastContact;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Customer() {
    }

    public Customer(UUID organizationId, String name, String company, String email,
                    CustomerStatus status, BigDecimal value) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.name = name;
        this.company = company;
        this.email = email;
        this.status = status;
        this.value = value;
        this.lastContact = LocalDate.now();
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public String getName() { return name; }
    public String getCompany() { return company; }
    public String getEmail() { return email; }
    public CustomerStatus getStatus() { return status; }
    public BigDecimal getValue() { return value; }
    public LocalDate getLastContact() { return lastContact; }
    public Instant getCreatedAt() { return createdAt; }

    public void changeStatus(CustomerStatus status) {
        this.status = status;
        this.lastContact = LocalDate.now();
    }
}

