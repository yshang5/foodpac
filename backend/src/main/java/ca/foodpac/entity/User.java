package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The subject from Google's OAuth2 token — stable unique identifier */
    @Column(nullable = false, unique = true)
    private String googleId;

    @Column(nullable = false)
    private String email;

    private String name;
    private String picture;   // DiceBear avatar URL (generated on first login)

    private String phone;
    private String company;
    private String address;

    /**
     * Extensible JSON blob (TEXT column) for future fields we haven't thought of yet.
     * e.g. {"googlePicture":"https://...", "preferredLang":"en", "notifications":{"email":true}}
     */
    @Column(columnDefinition = "TEXT")
    private String extra;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
