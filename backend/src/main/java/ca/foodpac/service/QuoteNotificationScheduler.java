package ca.foodpac.service;

import ca.foodpac.entity.QuoteItem;
import ca.foodpac.entity.QuoteRequest;
import ca.foodpac.repository.QuoteRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Every 5 minutes: scan for QuoteRequests that haven't been emailed yet,
 * send one email per request to the operations team, then mark emailSent = true.
 *
 * One POST from the user = one QuoteRequest (possibly containing multiple items)
 * = one email. No duplicate sends.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QuoteNotificationScheduler {

    private final QuoteRequestRepository quoteRequestRepository;
    private final EmailService           emailService;

    @Value("${app.mail.notify-to}")
    private String notifyTo;

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of("America/Toronto"));

    @Scheduled(fixedDelay = 5 * 60 * 1000)   // every 5 minutes
    @Transactional
    public void sendPendingQuoteEmails() {
        List<QuoteRequest> pending = quoteRequestRepository.findByEmailSentFalseOrderByCreatedAtAsc();
        if (pending.isEmpty()) return;

        log.info("QuoteNotifier: {} unsent quote(s) found", pending.size());

        for (QuoteRequest q : pending) {
            try {
                emailService.send(notifyTo, buildSubject(q), buildHtml(q));
                q.setEmailSent(true);
                quoteRequestRepository.save(q);
                log.info("Quote email sent for quoteId={}", q.getId());
            } catch (Exception e) {
                log.error("Failed to send email for quoteId={}: {}", q.getId(), e.getMessage());
                // leave emailSent=false — will retry next cycle
            }
        }
    }

    // ── Subject ──────────────────────────────────────────────────────────────

    private String buildSubject(QuoteRequest q) {
        String biz  = q.getBusinessName() != null ? q.getBusinessName() : q.getContactName();
        int    n    = q.getItems().size();
        return String.format("📦 New Quote Request – %s (%d item%s)", biz, n, n > 1 ? "s" : "");
    }

    // ── HTML body (bilingual CN + EN) ─────────────────────────────────────────

    private String buildHtml(QuoteRequest q) {
        String submittedAt = FMT.format(q.getCreatedAt()) + " ET";
        String biz = q.getBusinessName() != null && !q.getBusinessName().isBlank()
                ? q.getBusinessName() : "—";

        StringBuilder itemRows = new StringBuilder();
        int idx = 1;
        for (QuoteItem item : q.getItems()) {
            itemRows.append(String.format("""
                <tr style="border-bottom:1px solid #f0f0f0">
                  <td style="padding:10px 12px;color:#888;font-size:13px">%d</td>
                  <td style="padding:10px 12px">
                    <img src="%s" width="56" height="56"
                         style="object-fit:cover;border-radius:6px;border:1px solid #eee;display:block">
                  </td>
                  <td style="padding:10px 12px;font-size:13px;line-height:1.6">
                    <b>%s</b><br>
                    %s<br>
                    <span style="color:#666">%s · %s · <b>Qty %d</b></span>
                  </td>
                </tr>
                """,
                idx++,
                item.getImageUrl(),
                nvl(item.getProductLabel(), item.getProductType()),
                nvl(item.getSizeSpec(), ""),
                nvl(item.getMaterial(), ""),
                nvl(item.getProductType(), ""),
                item.getQuantity() != null ? item.getQuantity() : 0
            ));
        }

        return String.format("""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#f5f7f5;font-family:'Helvetica Neue',Arial,sans-serif">
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f7f5;padding:32px 0">
              <tr><td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                       style="background:#fff;border-radius:12px;overflow:hidden;
                              box-shadow:0 2px 12px rgba(0,0,0,.08)">

                  <!-- Header -->
                  <tr>
                    <td style="background:#2d6a4f;padding:24px 32px">
                      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">
                        📦 foodPac — New Quote Request<br>
                        <span style="font-size:14px;font-weight:400;opacity:.8">新的报价请求</span>
                      </h1>
                    </td>
                  </tr>

                  <!-- Contact info -->
                  <tr>
                    <td style="padding:24px 32px 16px">
                      <h2 style="margin:0 0 12px;font-size:15px;color:#333">
                        Contact Info &nbsp;/&nbsp; 联系信息
                      </h2>
                      <table cellpadding="0" cellspacing="0" style="width:100%%">
                        <tr>
                          <td style="width:50%%;vertical-align:top;padding-right:16px">
                            <p style="margin:4px 0;font-size:13px;color:#555">
                              <span style="color:#999">Name / 姓名</span><br>
                              <b style="color:#222">%s</b>
                            </p>
                            <p style="margin:8px 0 4px;font-size:13px;color:#555">
                              <span style="color:#999">Email</span><br>
                              <a href="mailto:%s" style="color:#2d6a4f;text-decoration:none">%s</a>
                            </p>
                          </td>
                          <td style="width:50%%;vertical-align:top">
                            <p style="margin:4px 0;font-size:13px;color:#555">
                              <span style="color:#999">Phone / 电话</span><br>
                              <b style="color:#222">%s</b>
                            </p>
                            <p style="margin:8px 0 4px;font-size:13px;color:#555">
                              <span style="color:#999">Business / 公司</span><br>
                              <b style="color:#222">%s</b>
                            </p>
                          </td>
                        </tr>
                        %s
                      </table>
                    </td>
                  </tr>

                  <!-- Items table -->
                  <tr>
                    <td style="padding:0 32px 24px">
                      <h2 style="margin:0 0 12px;font-size:15px;color:#333">
                        Items Requested &nbsp;/&nbsp; 请求商品
                      </h2>
                      <table cellpadding="0" cellspacing="0"
                             style="width:100%%;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden">
                        <thead>
                          <tr style="background:#f9faf9">
                            <th style="padding:10px 12px;font-size:12px;color:#999;text-align:left;font-weight:600">#</th>
                            <th style="padding:10px 12px;font-size:12px;color:#999;text-align:left;font-weight:600">Image</th>
                            <th style="padding:10px 12px;font-size:12px;color:#999;text-align:left;font-weight:600">Details / 详情</th>
                          </tr>
                        </thead>
                        <tbody>%s</tbody>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#f9faf9;padding:16px 32px;border-top:1px solid #eee">
                      <p style="margin:0;font-size:12px;color:#aaa">
                        Submitted / 提交时间: %s &nbsp;·&nbsp;
                        Quote ID: <code style="background:#eee;padding:1px 5px;border-radius:3px">%s</code>
                      </p>
                    </td>
                  </tr>

                </table>
              </td></tr>
            </table>
            </body>
            </html>
            """,
            // contact info slots
            q.getContactName(),
            q.getContactEmail(), q.getContactEmail(),
            q.getContactPhone(),
            biz,
            // notes row (optional)
            (q.getNotes() != null && !q.getNotes().isBlank())
                ? String.format("""
                  <tr><td colspan="2" style="padding-top:8px;font-size:13px;color:#555">
                    <span style="color:#999">Notes / 备注</span><br>%s
                  </td></tr>""", q.getNotes())
                : "",
            // items
            itemRows.toString(),
            // footer
            submittedAt,
            q.getId()
        );
    }

    private String nvl(String v, String fallback) {
        return (v != null && !v.isBlank()) ? v : fallback;
    }
}
