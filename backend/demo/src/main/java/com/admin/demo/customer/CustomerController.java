package com.admin.demo.customer;

import com.admin.demo.customer.CustomerRequests.ChangeStatus;
import com.admin.demo.customer.CustomerRequests.Create;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository repository;

    public CustomerController(CustomerRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Page<Customer> list(
            @RequestHeader("X-Organization-Id") UUID organizationId,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) CustomerStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 50),
                Sort.by("createdAt").descending());

        return status == null
                ? repository.findByOrganizationIdAndNameContainingIgnoreCase(organizationId, q, pageable)
                : repository.findByOrganizationIdAndStatusAndNameContainingIgnoreCase(
                        organizationId, status, q, pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Customer create(
            @RequestHeader("X-Organization-Id") UUID organizationId,
            @Valid @RequestBody Create request) {
        return repository.save(new Customer(organizationId, request.name(), request.company(),
                request.email(), request.status(), request.value()));
    }

    @PatchMapping("/{id}/status")
    public Customer changeStatus(
            @RequestHeader("X-Organization-Id") UUID organizationId,
            @PathVariable UUID id,
            @Valid @RequestBody ChangeStatus request) {
        var customer = findCustomer(id, organizationId);
        customer.changeStatus(request.status());
        return repository.save(customer);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader("X-Organization-Id") UUID organizationId,
            @PathVariable UUID id) {
        repository.delete(findCustomer(id, organizationId));
    }

    private Customer findCustomer(UUID id, UUID organizationId) {
        return repository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Customer not found"));
    }
}

