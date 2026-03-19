package ca.foodpac.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "product_type_config")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductTypeConfig {

    @Id
    @Column(length = 32)
    private String key;          // e.g. "BOX", "CUP", "BAG"

    @Column(nullable = false)
    private String label;        // e.g. "Takeout Box"

    @Column(nullable = false)
    private Integer displayOrder;
}
