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
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/follow")
@RequiredArgsConstructor
public class FollowController extends BaseController {

        private final FollowService followService;

        // --- Follow a user ---
        @PostMapping("/follow")
        public ResponseEntity<GlobalApiResponse<FollowDTO>> followUser(
                        @RequestBody FollowRequestDTO follow) {
                try {
                        FollowDTO followDTO = followService.followUser(follow.getFollower(), follow.getFollowee());
                        return ResponseEntity.ok(successResponse(
                                        followDTO,
                                        Messages.SUCCESS,
                                        "Successfully followed user"));
                } catch (IllegalArgumentException ex) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                        .body(errorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST));
                } catch (IllegalStateException ex) {
                        // treat as conflict (already following or DB state issues)
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                        .body(errorResponse(ex.getMessage(), HttpStatus.CONFLICT));
                } catch (Exception ex) {
                        ex.printStackTrace();
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(errorResponse("Failed to create follow relationship: " + ex.getMessage(),
                                                        HttpStatus.INTERNAL_SERVER_ERROR));
                }
        }

        // --- Unfollow a user ---
        @DeleteMapping("/unfollow")
        public ResponseEntity<GlobalApiResponse<Void>> unfollowUser(
                        @RequestParam Integer followerId,
                        @RequestParam Integer followeeId) {
                followService.unfollowUser(followerId, followeeId);
                return ResponseEntity.ok(successResponse(
                                null,
                                Messages.SUCCESS,
                                "Successfully unfollowed user"));
        }

        // --- Get followers of a user ---
        @GetMapping("/followers/{userId}")
        public ResponseEntity<GlobalApiResponse<List<FollowerDTO>>> getFollowers(@PathVariable Integer userId) {
                List<FollowerDTO> followers = followService.getFollowersOfUser(userId);
                return ResponseEntity.ok(successResponse(
                                followers,
                                Messages.SUCCESS,
                                "Followers fetched successfully"));
        }

        // --- Get following of a user ---
        @GetMapping("/following/{userId}")
        public ResponseEntity<GlobalApiResponse<List<FollowerDTO>>> getFollowing(@PathVariable Integer userId) {
                List<FollowerDTO> following = followService.getFollowing(userId);
                return ResponseEntity.ok(successResponse(
                                following,
                                Messages.SUCCESS,
                                "Following fetched successfully"));
        }

        // --- Check if follower follows followee ---
        @GetMapping("/check")
        public ResponseEntity<GlobalApiResponse<Boolean>> isFollowing(
                        @RequestParam Integer followerId,
                        @RequestParam Integer followeeId) {
                boolean following = followService.isFollowing(followerId, followeeId);
                return ResponseEntity.ok(successResponse(
                                following,
                                Messages.SUCCESS,
                                "Follow status checked"));
        }

        @GetMapping("/isMutual")
        public ResponseEntity<GlobalApiResponse<Boolean>> isMutual(
                        @RequestParam Integer followerId,
                        @RequestParam Integer followeeId) {
                boolean following = followService.isMutual(followerId, followeeId);
                return ResponseEntity.ok(successResponse(
                                following,
                                Messages.SUCCESS,
                                "Mutual follow status checked"));
        }

        @PostMapping("/search")
        public ResponseEntity<GlobalApiResponse<PaginatedDtoResponse<FollowDTO>>> searchFollows(
                        @RequestBody SearchFilter filter) {
                return ResponseEntity.ok(successResponse(
                                followService.searchFollows(filter),
                                Messages.SUCCESS,
                                "Follows fetched"));
        }

}
