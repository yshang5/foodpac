package ca.foodpac.controller;

import ca.foodpac.dto.UpdateProfileRequest;
import ca.foodpac.dto.UserDto;
import ca.foodpac.entity.User;
import ca.foodpac.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * PUT /api/v1/users/profile — update the current user's editable fields
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @PutMapping("/profile")
    public ResponseEntity<UserDto> updateProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateProfileRequest req) {

        if (user == null) return ResponseEntity.status(401).build();

        if (req.name()    != null) user.setName(req.name().isBlank()    ? null : req.name().strip());
        if (req.phone()   != null) user.setPhone(req.phone().isBlank()   ? null : req.phone().strip());
        if (req.company() != null) user.setCompany(req.company().isBlank() ? null : req.company().strip());
        if (req.address() != null) user.setAddress(req.address().isBlank() ? null : req.address().strip());
        if (req.extra()   != null) user.setExtra(req.extra().isBlank()   ? null : req.extra().strip());

        user = userRepository.save(user);
        return ResponseEntity.ok(UserDto.from(user));
    }
}
