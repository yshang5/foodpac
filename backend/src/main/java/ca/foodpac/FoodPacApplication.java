package ca.foodpac;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FoodPacApplication {
    public static void main(String[] args) {
        SpringApplication.run(FoodPacApplication.class, args);
    }
}
