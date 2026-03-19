package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "quote_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QuoteItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quote_request_id", nullable = false)
    private QuoteRequest quoteRequest;

    @Column(nullable = false, length = 2048)
    private String imageUrl;

    private String productType;   // e.g. "BOX"
    private String productLabel;  // e.g. "Takeout Box" (snapshot at submit time)
    private String sizeSpec;      // e.g. "Medium (150×150×70mm)"
    private String material;      // e.g. "KRAFT"

    private Integer quantity;
}
