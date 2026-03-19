package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "design_results")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DesignResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private DesignSession session;

    @Column(nullable = false)
    private String imageUrl;

    /** The description used to generate this design */
    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
