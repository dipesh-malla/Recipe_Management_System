package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiRequest;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.UserDTO.UserDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.UserService;
import com.esewa.javabackend.utils.SearchFilter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController extends BaseController {

    private final UserService userService;
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<GlobalApiResponse<?>> createUser(@RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(successResponse(
                userService.saveUser(userDTO),
                Messages.SUCCESS,
                "User created"
        ));
    }



    @GetMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<?>> getUser(@PathVariable Integer id) {
        return ResponseEntity.ok(successResponse(
                 userService.getUserById(id),
                Messages.SUCCESS,
                "User fetched"
        ));
    }

    @GetMapping
    public ResponseEntity<?> findAllUser() {
        return ResponseEntity.ok(userService.getAllUser()
        );
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

    @PostMapping("/filter")
    public ResponseEntity<GlobalApiResponse<?>> getAllUsers(
            @RequestBody GlobalApiRequest<SearchFilter> filterReq) {
        return ResponseEntity.ok(successResponse(
                 userService.getAllUsers(filterReq.getData()),
                Messages.SUCCESS,
                "Users fetched"
        ));
    }
}

