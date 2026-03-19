package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "design_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DesignSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)   // nullable = guest session (no account)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.CHATTING;

    /** project_id returned by Packify after calling the design API */
    private String packifyProjectId;

    /** The description extracted by LLM and sent to Packify */
    @Column(columnDefinition = "TEXT")
    private String lastDescription;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    public enum Status { CHATTING, GENERATING, COMPLETED, FAILED }
}
