package com.admin.demo.customer;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    Page<Customer> findByOrganizationIdAndNameContainingIgnoreCase(
            UUID organizationId, String query, Pageable pageable);

    Page<Customer> findByOrganizationIdAndStatusAndNameContainingIgnoreCase(
            UUID organizationId, CustomerStatus status, String query, Pageable pageable);

    Optional<Customer> findByIdAndOrganizationId(UUID id, UUID organizationId);
}

