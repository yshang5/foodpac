package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "cart_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 2048)
    private String imageUrl;

    private String productType;   // e.g. "BOX"
    private String productLabel;  // e.g. "Takeout Box"
    private String sizeSpec;      // e.g. "Medium (150×150×70mm)"
    private String material;      // e.g. "KRAFT" (optional)
    private Integer quantity;     // required

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
