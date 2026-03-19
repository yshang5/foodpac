package ca.foodpac.controller;

import ca.foodpac.dto.ContactInquiryRequest;
import ca.foodpac.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * POST /api/v1/contact — receives the "Get a Free Quote" contact form
 * and immediately sends a notification email to the team.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/contact")
@RequiredArgsConstructor
public class ContactController {

    private final EmailService emailService;

    @Value("${app.mail.notify-to}")
    private String notifyTo;

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of("America/Toronto"));

    @PostMapping
    public ResponseEntity<Map<String, String>> submit(@RequestBody ContactInquiryRequest req) {

        if (req.email() == null || req.email().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "email is required"));
        }

        log.info("Contact inquiry from {} <{}>", req.contactName(), req.email());

        try {
            emailService.send(notifyTo, buildSubject(req), buildHtml(req));
        } catch (Exception e) {
            log.error("Failed to send contact email from {}: {}", req.email(), e.getMessage());
            // Still return 200 — don't expose internal errors to the user
        }

        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // ── Subject ──────────────────────────────────────────────────────────────

    private String buildSubject(ContactInquiryRequest r) {
        String name = r.contactName() != null ? r.contactName() : r.email();
        return String.format("💬 Free Quote Inquiry – %s (%s)", name, r.email());
    }

    // ── HTML body (bilingual) ─────────────────────────────────────────────────

    private String buildHtml(ContactInquiryRequest r) {
        String now   = FMT.format(ZonedDateTime.now()) + " ET";
        String biz   = nvl(r.businessName(), "—");
        String phone = nvl(r.phone(), "—");
        String city  = nvl(r.city(), "—");
        String type  = nvl(r.restaurantType(), "—");
        String qty   = nvl(r.quantity(), "—");
        String logo  = nvl(r.hasLogo(), "—");
        String notes = nvl(r.notes(), "—");
        String prods = (r.products() != null && !r.products().isEmpty())
                ? String.join(", ", r.products()) : "—";

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
                    <td style="background:#f57c00;padding:24px 32px">
                      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">
                        💬 foodPac — Free Quote Inquiry<br>
                        <span style="font-size:14px;font-weight:400;opacity:.85">免费报价询问</span>
                      </h1>
                    </td>
                  </tr>

                  <!-- Contact -->
                  <tr>
                    <td style="padding:24px 32px 16px">
                      <h2 style="margin:0 0 14px;font-size:15px;color:#333">
                        Contact Info &nbsp;/&nbsp; 联系信息
                      </h2>
                      <table cellpadding="0" cellspacing="0" style="width:100%%">
                        <tr>
                          <td style="width:50%%;vertical-align:top;padding-right:16px">
                            <p style="margin:4px 0;font-size:13px">
                              <span style="color:#999">Name / 姓名</span><br>
                              <b>%s</b>
                            </p>
                            <p style="margin:8px 0 4px;font-size:13px">
                              <span style="color:#999">Email</span><br>
                              <a href="mailto:%s" style="color:#f57c00;text-decoration:none">%s</a>
                            </p>
                            <p style="margin:8px 0 4px;font-size:13px">
                              <span style="color:#999">Phone / 电话</span><br>
                              <b>%s</b>
                            </p>
                          </td>
                          <td style="width:50%%;vertical-align:top">
                            <p style="margin:4px 0;font-size:13px">
                              <span style="color:#999">Business / 公司</span><br>
                              <b>%s</b>
                            </p>
                            <p style="margin:8px 0 4px;font-size:13px">
                              <span style="color:#999">City / 城市</span><br>
                              <b>%s</b>
                            </p>
                            <p style="margin:8px 0 4px;font-size:13px">
                              <span style="color:#999">Restaurant Type / 餐厅类型</span><br>
                              <b>%s</b>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Requirements -->
                  <tr>
                    <td style="padding:0 32px 24px">
                      <h2 style="margin:0 0 14px;font-size:15px;color:#333">
                        Requirements &nbsp;/&nbsp; 需求
                      </h2>
                      <table cellpadding="0" cellspacing="0"
                             style="width:100%%;border:1px solid #eee;border-radius:8px;overflow:hidden;font-size:13px">
                        <tr style="background:#fafafa">
                          <td style="padding:10px 16px;color:#999;width:40%%">Products / 产品</td>
                          <td style="padding:10px 16px"><b>%s</b></td>
                        </tr>
                        <tr style="border-top:1px solid #f0f0f0">
                          <td style="padding:10px 16px;color:#999">Quantity / 数量</td>
                          <td style="padding:10px 16px"><b>%s</b></td>
                        </tr>
                        <tr style="border-top:1px solid #f0f0f0;background:#fafafa">
                          <td style="padding:10px 16px;color:#999">Has Logo / 有Logo</td>
                          <td style="padding:10px 16px"><b>%s</b></td>
                        </tr>
                        <tr style="border-top:1px solid #f0f0f0">
                          <td style="padding:10px 16px;color:#999;vertical-align:top">Notes / 备注</td>
                          <td style="padding:10px 16px">%s</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#f9faf9;padding:16px 32px;border-top:1px solid #eee">
                      <p style="margin:0;font-size:12px;color:#aaa">
                        Submitted / 提交时间: %s
                      </p>
                    </td>
                  </tr>

                </table>
              </td></tr>
            </table>
            </body>
            </html>
            """,
            nvl(r.contactName(), "—"),
            r.email(), r.email(),
            phone,
            biz, city, type,
            prods, qty, logo, notes,
            now
        );
    }

    private String nvl(String v, String fallback) {
        return (v != null && !v.isBlank()) ? v : fallback;
    }
}
