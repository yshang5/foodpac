package ca.foodpac.dto;

import ca.foodpac.entity.User;

/** Returned by GET /api/v1/auth/me and PUT /api/v1/users/profile */
public record UserDto(
        Long   id,
        String email,
        String name,
        String picture,
        String phone,
        String company,
        String address,
        String extra
) {
    public static UserDto from(User u) {
        return new UserDto(
                u.getId(),
                u.getEmail(),
                u.getName(),
                u.getPicture(),
                u.getPhone(),
                u.getCompany(),
                u.getAddress(),
                u.getExtra()
        );
    }
}
