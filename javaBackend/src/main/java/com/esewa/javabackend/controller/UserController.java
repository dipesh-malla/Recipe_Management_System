package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiRequest;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.UserDTO.UserProfileDTO;
import com.esewa.javabackend.dto.UserDTO.UserRequestDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.MediaService;
import com.esewa.javabackend.service.UserService;
import com.esewa.javabackend.utils.SearchFilter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController extends BaseController {

    private final UserService userService;
    private final MediaService mediaService;

    public UserController(UserService userService, MediaService mediaService) {
        this.userService = userService;
        this.mediaService = mediaService;
    }

    @PostMapping
    public ResponseEntity<GlobalApiResponse<?>> createUser(@RequestBody UserRequestDTO userDTO) {
        return ResponseEntity.ok(successResponse(
                userService.saveUser(userDTO),
                Messages.SUCCESS,
                "User created"));
    }

    @PutMapping(value = "/update", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GlobalApiResponse<?>> updateUserProfile(
            @RequestPart("profile") String profileJSON,
            @RequestPart(value = "file", required = false) MultipartFile profilePic) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        UserProfileDTO profileDTO = objectMapper.readValue(profileJSON, UserProfileDTO.class);

        UserResponseDTO updatedUser = mediaService.updateUserProfile(profileDTO, profilePic);
        return ResponseEntity.ok(successResponse(
                updatedUser,
                Messages.SUCCESS,
                "User updated"));
    }

    // @PutMapping("/profile-picture")
    // public ResponseEntity<GlobalApiResponse<?>> uploadProfilePicture(
    // @RequestParam("userId") Integer userId,
    // @RequestParam("file") MultipartFile file
    // ) {
    // String imageUrl = mediaService.updateUserProfile( file, "profile");
    // return ResponseEntity.ok(successResponse(imageUrl, Messages.SUCCESS, "Profile
    // picture updated "));
    // }

    @GetMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<?>> getUser(@PathVariable Integer id) {
        return ResponseEntity.ok(successResponse(
                userService.getUserById(id),
                Messages.SUCCESS,
                "User fetched"));
    }

    @GetMapping
    public ResponseEntity<GlobalApiResponse<?>> findAllUser(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(successResponse(
                userService.getAllUsers(page, size),
                Messages.SAVED_SUCCESS));
    }

    // Dedicated endpoint for Chef Discovery
    @GetMapping(path = "/chefs")
    public ResponseEntity<GlobalApiResponse<?>> getChefs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        // Return only chefs with recipes, sorted by recipe count descending
        return ResponseEntity.ok(successResponse(
                userService.getChefsWithRecipes(page, size),
                Messages.SAVED_SUCCESS));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<?>> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(successResponse(
                null,
                Messages.SUCCESS,
                "User deleted"

        ));
    }

    @GetMapping("/filter")
    public ResponseEntity<GlobalApiResponse<?>> getAllUsers(
            @RequestBody GlobalApiRequest<SearchFilter> filterReq) {
        return ResponseEntity.ok(successResponse(
                userService.getAllUsers(filterReq.getData()),
                Messages.SUCCESS,
                "Users fetched"));
    }
}
