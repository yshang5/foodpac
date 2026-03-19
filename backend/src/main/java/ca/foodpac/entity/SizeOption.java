package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "size_option")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SizeOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32)
    private String productTypeKey;   // FK to ProductTypeConfig.key

    @Column(nullable = false)
    private String label;            // e.g. "Small (100×100×50mm)"

    @Column(nullable = false)
    private Integer sortOrder;
}
