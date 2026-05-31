package com.brooks.purchase.service;

import com.brooks.common.dto.PageResponse;
import com.brooks.purchase.dto.AdminTransactionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read-only admin transaction log: every COMPLETED sale joined with the guide, both parties, the
 * creator's payout details, and the earnings/payout ledger. ADMIN-only (gated by SecurityConfig on
 * /api/admin/**). Uses a single denormalizing SQL join with optional date-range / creator / guide
 * filters; also produces a CSV export of the same (filtered) set.
 */
@Service
@RequiredArgsConstructor
public class AdminTransactionService {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String BASE = """
            FROM purchases p
            JOIN guides g ON g.id = p.guide_id
            JOIN users cu ON cu.id = g.creator_id
            LEFT JOIN user_profiles cp ON cp.user_id = cu.id
            JOIN users bu ON bu.id = p.buyer_id
            LEFT JOIN user_profiles bp ON bp.user_id = bu.id
            LEFT JOIN creator_earnings e ON e.purchase_id = p.id
            WHERE p.status = 'COMPLETED'
            """;

    private static final String SELECT = """
            SELECT p.id AS purchase_id,
                   COALESCE(p.completed_at, p.created_at) AS sale_time,
                   p.guide_id AS guide_id,
                   COALESCE(p.guide_title_at_purchase, g.title) AS guide_title,
                   g.creator_id AS creator_id,
                   COALESCE(cp.display_name, cu.username) AS creator_name,
                   cu.username AS creator_username,
                   bu.id AS buyer_id,
                   COALESCE(bp.display_name, bu.username) AS buyer_name,
                   bu.email AS buyer_email,
                   p.price_cents_paid AS gross_cents,
                   COALESCE(e.commission_cents, p.platform_fee_cents) AS commission_cents,
                   COALESCE(e.net_amount_cents, p.price_cents_paid - p.platform_fee_cents) AS net_cents,
                   p.currency AS currency,
                   p.commission_rate_bps AS commission_rate_bps,
                   cu.payout_iban AS creator_iban,
                   cu.payout_beneficiary_name AS creator_beneficiary_name,
                   cu.payout_currency AS payout_currency,
                   e.payout_status AS payout_status,
                   e.paid_at AS paid_at,
                   p.bog_order_id AS bog_order_id,
                   p.external_order_id AS external_order_id,
                   p.bog_ipay_payment_id AS bog_ipay_payment_id,
                   p.bog_transaction_id AS bog_transaction_id,
                   p.status AS status
            """;

    public record Filters(Instant from, Instant to, UUID creatorId, UUID guideId) {}

    public PageResponse<AdminTransactionResponse> list(Filters f, int page, int size) {
        StringBuilder where = new StringBuilder();
        MapSqlParameterSource params = new MapSqlParameterSource();
        applyFilters(f, where, params);

        Long total = jdbc.queryForObject("SELECT COUNT(*) " + BASE + where, params, Long.class);
        long totalElements = total == null ? 0L : total;

        params.addValue("limit", size);
        params.addValue("offset", (long) page * size);
        String sql = SELECT + BASE + where + " ORDER BY sale_time DESC LIMIT :limit OFFSET :offset";
        List<AdminTransactionResponse> rows = jdbc.query(sql, params, AdminTransactionService::mapRow);

        return PageResponse.of(rows, page, size, totalElements);
    }

    /** Full (filtered) result set as CSV. Capped to avoid unbounded exports. */
    public String exportCsv(Filters f) {
        StringBuilder where = new StringBuilder();
        MapSqlParameterSource params = new MapSqlParameterSource();
        applyFilters(f, where, params);
        params.addValue("limit", 50_000);
        String sql = SELECT + BASE + where + " ORDER BY sale_time DESC LIMIT :limit";
        List<AdminTransactionResponse> rows = jdbc.query(sql, params, AdminTransactionService::mapRow);

        StringBuilder sb = new StringBuilder();
        sb.append("sale_time,purchase_id,guide_id,guide_title,creator_id,creator_name,creator_username,"
                + "buyer_id,buyer_name,buyer_email,gross_cents,commission_cents,net_cents,currency,"
                + "commission_rate_bps,creator_iban,creator_beneficiary_name,payout_currency,payout_status,"
                + "paid_at,bog_order_id,external_order_id,bog_ipay_payment_id,bog_transaction_id,status\n");
        for (AdminTransactionResponse r : rows) {
            sb.append(csv(r.saleTime())).append(',')
              .append(csv(r.purchaseId())).append(',')
              .append(csv(r.guideId())).append(',')
              .append(csv(r.guideTitle())).append(',')
              .append(csv(r.creatorId())).append(',')
              .append(csv(r.creatorName())).append(',')
              .append(csv(r.creatorUsername())).append(',')
              .append(csv(r.buyerId())).append(',')
              .append(csv(r.buyerName())).append(',')
              .append(csv(r.buyerEmail())).append(',')
              .append(r.grossCents()).append(',')
              .append(r.commissionCents()).append(',')
              .append(r.netCents()).append(',')
              .append(csv(r.currency())).append(',')
              .append(csv(r.commissionRateBps())).append(',')
              .append(csv(r.creatorIban())).append(',')
              .append(csv(r.creatorBeneficiaryName())).append(',')
              .append(csv(r.payoutCurrency())).append(',')
              .append(csv(r.payoutStatus())).append(',')
              .append(csv(r.paidAt())).append(',')
              .append(csv(r.bogOrderId())).append(',')
              .append(csv(r.externalOrderId())).append(',')
              .append(csv(r.bogIpayPaymentId())).append(',')
              .append(csv(r.bogTransactionId())).append(',')
              .append(csv(r.status())).append('\n');
        }
        return sb.toString();
    }

    private void applyFilters(Filters f, StringBuilder where, MapSqlParameterSource params) {
        if (f.from() != null) {
            where.append(" AND COALESCE(p.completed_at, p.created_at) >= :from");
            params.addValue("from", Timestamp.from(f.from()));
        }
        if (f.to() != null) {
            where.append(" AND COALESCE(p.completed_at, p.created_at) < :to");
            params.addValue("to", Timestamp.from(f.to()));
        }
        if (f.creatorId() != null) {
            where.append(" AND g.creator_id = :creatorId");
            params.addValue("creatorId", f.creatorId());
        }
        if (f.guideId() != null) {
            where.append(" AND p.guide_id = :guideId");
            params.addValue("guideId", f.guideId());
        }
    }

    private static AdminTransactionResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new AdminTransactionResponse(
                rs.getObject("purchase_id", UUID.class),
                instant(rs.getTimestamp("sale_time")),
                rs.getObject("guide_id", UUID.class),
                rs.getString("guide_title"),
                rs.getObject("creator_id", UUID.class),
                rs.getString("creator_name"),
                rs.getString("creator_username"),
                rs.getObject("buyer_id", UUID.class),
                rs.getString("buyer_name"),
                rs.getString("buyer_email"),
                rs.getInt("gross_cents"),
                rs.getInt("commission_cents"),
                rs.getInt("net_cents"),
                rs.getString("currency"),
                (Integer) rs.getObject("commission_rate_bps"),
                rs.getString("creator_iban"),
                rs.getString("creator_beneficiary_name"),
                rs.getString("payout_currency"),
                rs.getString("payout_status"),
                instant(rs.getTimestamp("paid_at")),
                rs.getString("bog_order_id"),
                rs.getString("external_order_id"),
                rs.getString("bog_ipay_payment_id"),
                rs.getString("bog_transaction_id"),
                rs.getString("status")
        );
    }

    private static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    // Minimal RFC-4180 CSV escaping: quote when the value contains comma, quote, CR or LF.
    private static String csv(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return '"' + s.replace("\"", "\"\"") + '"';
        }
        return s;
    }
}
