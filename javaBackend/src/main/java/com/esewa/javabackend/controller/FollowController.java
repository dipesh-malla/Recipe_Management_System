package com.esewa.javabackend.controller;


import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.dto.UserDTO.FollowDTO;
import com.esewa.javabackend.dto.UserDTO.FollowRequestDTO;
import com.esewa.javabackend.dto.UserDTO.FollowerDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.FollowService;
import com.esewa.javabackend.utils.SearchFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class FollowController extends BaseController {

    private final FollowService followService;

    // --- Follow a user ---
    @PostMapping("/follow")
    public ResponseEntity<FollowDTO> followUser(
         @RequestBody   FollowRequestDTO follow
    ) {
        FollowDTO followDTO = followService.followUser(follow.getFollower(), follow.getFollowee());
        return ResponseEntity.ok(followDTO);
    }

    // --- Unfollow a user ---
    @DeleteMapping("/unfollow")
    public ResponseEntity<Void> unfollowUser(
           @RequestBody FollowRequestDTO follow
    ) {
        followService.unfollowUser(follow.getFollower(), follow.getFollowee());
        return ResponseEntity.noContent().build();
    }

    // --- Get followers of a user ---
    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowerDTO>> getFollowers(@PathVariable Integer userId) {
        List<FollowerDTO> followers = followService.getFollowersOfUser(userId);
        return ResponseEntity.ok(followers);
    }

    // --- Get following of a user ---
    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowerDTO>> getFollowing(@PathVariable Integer userId) {
        List<FollowerDTO> following = followService.getFollowing(userId);
        return ResponseEntity.ok(following);
    }

    // --- Check if follower follows followee ---
    @GetMapping("/follows")
    public ResponseEntity<Boolean> isFollowing(
         @RequestBody   FollowRequestDTO follow
    ) {
        boolean following = followService.isFollowing(follow.getFollower(), follow.getFollowee());
        return ResponseEntity.ok(following);
    }

    @GetMapping("/isMutual")
    public ResponseEntity<Boolean> isMutual(
            @RequestBody   FollowRequestDTO follow
    ) {
        boolean following = followService.isMutual(follow.getFollower(), follow.getFollowee());
        return ResponseEntity.ok(following);
    }

    @GetMapping("/search")
    public ResponseEntity<GlobalApiResponse<PaginatedDtoResponse<FollowDTO>>> searchFollows(@RequestBody SearchFilter filter) {
        return ResponseEntity.ok(successResponse(
                followService.searchFollows(filter),
                Messages.SUCCESS,
                "User Fetched"
        ));
    }




}

