package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A form-based design generation job: one submission of the Design Online
 * form producing one styled mockup per showcase product (6 total).
 */
@Entity
@Table(name = "design_jobs", indexes = {
        @Index(name = "idx_design_jobs_anon", columnList = "anonToken")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DesignJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)   // null = guest job
    private User user;

    /** Anonymous visitor token (fp_anon cookie) for guest rate limiting */
    private String anonToken;

    private String brandText;
    private String logoFile;          // stored filename of uploaded logo
    private String restaurantType;
    private String slogan;
    private String address;
    private String phone;
    private String qrFile;            // stored filename of uploaded QR code

    /** JSON brand spec returned by the LLM (palette, style) */
    @Column(columnDefinition = "TEXT")
    private String brandSpec;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(columnDefinition = "TEXT")
    private String error;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    public enum Status { PENDING, RUNNING, COMPLETED, FAILED }
}
