package com.esewa.javabackend.controller;


import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiRequest;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.UserDTO.UserStatDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.UserStatService;
import com.esewa.javabackend.utils.SearchFilter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user-stats")
public class UserStatController extends BaseController {

    private final UserStatService userStatService;

    public UserStatController(UserStatService userStatService) {
        this.userStatService = userStatService;
    }

    @PostMapping
    public ResponseEntity<GlobalApiResponse<?>> createUserStat(@RequestBody UserStatDTO userStatDTO) {
        return ResponseEntity.ok(successResponse(
                userStatService.saveUserStat(userStatDTO),
                Messages.SUCCESS,
                "UserStat created"
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<?>> getUserStat(@PathVariable Integer id) {
        return ResponseEntity.ok(successResponse(
                userStatService.getUserStatById(id),
                Messages.SUCCESS,
                "UserStat fetched"
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<?>> deleteUserStat(@PathVariable Integer id) {
        userStatService.deleteUserStat(id);
        return ResponseEntity.ok(successResponse(
                null,
                Messages.SUCCESS,
                "UserStat deleted"
        ));
    }

    @PostMapping("/filter")
    public ResponseEntity<GlobalApiResponse<?>> getAllUserStats(
            @RequestBody GlobalApiRequest<SearchFilter> filterReq) {
        return ResponseEntity.ok(successResponse(
                userStatService.getAllUserStats(filterReq.getData()),
                Messages.SUCCESS,
                "UserStats fetched"
        ));
    }
}

