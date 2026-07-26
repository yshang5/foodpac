package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** One generated mockup image (one product) belonging to a DesignJob. */
@Entity
@Table(name = "design_job_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DesignJobItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private DesignJob job;

    @Column(nullable = false)
    private String productId;         // e.g. box-kraft

    @Column(nullable = false)
    private String productLabel;      // e.g. Kraft Takeout Box

    @Column(nullable = false)
    private String productType;       // cart type key, e.g. BOX

    @Column(nullable = false)
    private String imageUrl;          // /api/v1/design/files/<name>

    @Builder.Default
    private boolean deleted = false;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
