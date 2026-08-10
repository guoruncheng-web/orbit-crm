package com.admin.demo.dashboard;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final JdbcClient jdbcClient;

    public DashboardController(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @GetMapping("/summary")
    public DashboardSummary summary(
            @RequestHeader("X-Organization-Id") UUID organizationId) {
        List<StatusSummary> byStatus = jdbcClient.sql("""
                        select status, count(*) as customer_count, coalesce(sum(value), 0) as total_value
                        from customers
                        where organization_id = :organizationId
                        group by status
                        """)
                .param("organizationId", organizationId)
                .query((rs, rowNumber) -> new StatusSummary(
                        rs.getString("status"),
                        rs.getLong("customer_count"),
                        rs.getBigDecimal("total_value")))
                .list();

        long customers = byStatus.stream().mapToLong(StatusSummary::count).sum();
        BigDecimal pipeline = byStatus.stream()
                .map(StatusSummary::value)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardSummary(customers, pipeline, 12, 28.4, byStatus,
                List.of(32, 38, 35, 48, 44, 57, 63, 68, 75, 72, 84, 92));
    }

    public record StatusSummary(String status, long count, BigDecimal value) {
    }

    public record DashboardSummary(
            long customers,
            BigDecimal pipeline,
            int activeProjects,
            double conversionRate,
            List<StatusSummary> byStatus,
            List<Integer> revenue) {
    }
}

