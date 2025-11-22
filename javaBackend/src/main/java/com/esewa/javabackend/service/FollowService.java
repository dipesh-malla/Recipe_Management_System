package com.esewa.javabackend.service;

import com.esewa.javabackend.config.kafka.InteractionProducer;
import com.esewa.javabackend.config.kafka.NotificationProducer;
import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.dto.event.InteractionEvent;
import com.esewa.javabackend.dto.event.NotificationEvent;
import com.esewa.javabackend.dto.UserDTO.FollowDTO;
import com.esewa.javabackend.dto.UserDTO.FollowerDTO;
import com.esewa.javabackend.dto.UserDTO.UserDTO;
import com.esewa.javabackend.enums.FollowStatus;
import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.NotificationType;
import com.esewa.javabackend.mapper.FollowMapper;
import com.esewa.javabackend.module.Conversation;
import com.esewa.javabackend.module.Follow;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.module.UserStats;
import com.esewa.javabackend.repository.JpaRepository.ConversationRepository;
import com.esewa.javabackend.repository.JpaRepository.FollowRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import com.esewa.javabackend.repository.JpaRepository.UserStatsRepository;
import com.esewa.javabackend.utils.PaginatedResHandler;
import com.esewa.javabackend.utils.SearchFilter;
import com.esewa.javabackend.utils.specification.FollowSpecification;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import com.esewa.javabackend.enums.ResourceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FollowService {

        private final FollowRepository followRepository;
        private final UserRepository userRepository;
        private final UserStatsRepository userStatsRepository;
        private final FollowMapper followMapper;
        private final ConversationRepository conversationRepository;
        private final NotificationProducer notificationProducer;
        private final InteractionProducer interactionProducer;

        @Transactional
        public FollowDTO followUser(Integer followerId, Integer followeeId) {
                if (Objects.equals(followerId, followeeId))
                        throw new IllegalArgumentException("Cannot follow yourself");

                User follower = userRepository.findById(followerId)
                                .orElseThrow(() -> new RuntimeException("Follower not found"));
                User followee = userRepository.findById(followeeId)
                                .orElseThrow(() -> new RuntimeException("Followee not found"));

                // Check if already following
                Optional<Follow> existingFollow = followRepository.findByFollowerIdAndFolloweeId(followerId,
                                followeeId);
                if (existingFollow.isPresent()) {
                        throw new IllegalStateException("Already following");
                }

                Follow follow = Follow.builder()
                                .follower(follower)
                                .followee(followee)
                                .status(FollowStatus.ACTIVE)
                                .build();

                try {
                        followRepository.save(follow);
                        updateUserStats(follower, followee, true);
                } catch (Exception e) {
                        // Handle any database constraint violations
                        throw new IllegalStateException("Failed to create follow relationship: " + e.getMessage());
                }

                // After following, check if mutual follow exists
                if (followRepository.existsByFollowerAndFollowee(followee, follower)) {
                        createConversationIfNotExists(follower, followee);
                }

                notificationProducer.sendNotification(NotificationEvent.builder()
                                .senderId(followerId)
                                .receiverId(followeeId)
                                .type(NotificationType.FOLLOW)
                                .message(follower.getUsername() + " started following you")
                                .referenceId(followeeId)
                                .build());
                interactionProducer.sendInteraction(
                                InteractionEvent.builder()
                                                .userId(follower.getId())
                                                .resourceType(ResourceType.USER)
                                                .resourceId(followee.getId())
                                                .action(InteractionAction.FOLLOW)
                                                .value(4.0)
                                                .build());

                return followMapper.toDTO(follow);
        }

        private void createConversationIfNotExists(User user1, User user2) {
                boolean exists = conversationRepository.findPrivateConversation(user1, user2).isPresent();
                if (exists)
                        return;

                Conversation conversation = Conversation.builder()
                                .participants(List.of(user1, user2))
                                .build();

                conversationRepository.save(conversation);
                System.out.println("New conversation created between: "
                                + user1.getUsername() + " and " + user2.getUsername());
        }

        private void updateUserStats(User follower, User followee, boolean followed) {
                // Fetch follower stats
                UserStats followerStats = userStatsRepository.findByUser(follower)
                                .orElseGet(() -> {
                                        UserStats us = UserStats.builder()
                                                        .user(follower)
                                                        .recipeCount(0)
                                                        .followersCount(0)
                                                        .followingCount(0)
                                                        .build();
                                        return userStatsRepository.save(us);
                                });

                // Fetch followee stats
                UserStats followeeStats = userStatsRepository.findByUser(followee)
                                .orElseGet(() -> {
                                        UserStats us = UserStats.builder()
                                                        .user(followee)
                                                        .recipeCount(0)
                                                        .followersCount(0)
                                                        .followingCount(0)
                                                        .build();
                                        return userStatsRepository.save(us);
                                });

                if (followed) {
                        followerStats.setFollowingCount(followerStats.getFollowingCount() + 1);
                        followeeStats.setFollowersCount(followeeStats.getFollowersCount() + 1);
                } else {
                        followerStats.setFollowingCount(Math.max(0, followerStats.getFollowingCount() - 1));
                        followeeStats.setFollowersCount(Math.max(0, followeeStats.getFollowersCount() - 1));
                }

                // Save individually to ensure flush
                userStatsRepository.save(followerStats);
                userStatsRepository.save(followeeStats);
        }

        public void unfollowUser(Integer followerId, Integer followeeId) {
                Follow follow = followRepository.findByFollowerIdAndFolloweeId(followerId, followeeId)
                                .orElseThrow(() -> new RuntimeException("Follow relationship not found"));
                followRepository.delete(follow);
                updateUserStats(follow.getFollower(), follow.getFollowee(), false);
        }

        public List<FollowerDTO> getFollowersOfUser(Integer userId) {
                List<Follow> followers = followRepository.findByFolloweeId(userId);
                return followers.stream()
                                .map(f -> FollowerDTO.builder()
                                                .id(f.getFollower().getId())
                                                .username(f.getFollower().getUsername())
                                                .displayName(f.getFollower().getDisplayName())
                                                .profile(f.getFollower().getProfile() != null
                                                                ? f.getFollower().getProfile().getUrl()
                                                                : null)
                                                .build())
                                .toList();
        }

        public List<FollowerDTO> getFollowing(Integer userId) {
                List<Follow> followers = followRepository.findByFollowerId(userId);
                return followers.stream()
                                .map(f -> FollowerDTO.builder()
                                                .id(f.getFollowee().getId())
                                                .username(f.getFollowee().getUsername())
                                                .displayName(f.getFollowee().getDisplayName())
                                                .profile(f.getFollower().getProfile() != null
                                                                ? f.getFollower().getProfile().getUrl()
                                                                : null)
                                                .build())
                                .toList();
        }

        public boolean isFollowing(Integer followerId, Integer followeeId) {
                return followRepository.existsByFollowerIdAndFolloweeId(followerId, followeeId);
        }

        @Transactional
        public PaginatedDtoResponse<FollowDTO> searchFollows(SearchFilter filter) {
                if (filter == null || filter.getPagination() == null) {
                        return PaginatedDtoResponse.<FollowDTO>builder()
                                        .data(Collections.emptyList())
                                        .totalElements(0L)
                                        .totalPages(0)
                                        .build();
                }

                // Build pageable
                PageRequest pageable = PageRequest.of(
                                filter.getPagination().getPage(),
                                filter.getPagination().getSize(),
                                Sort.by(Sort.Direction.fromString(filter.getSortOrder()), filter.getSortBy()));

                // Fetch follows
                Page<Follow> followsPage = followRepository.findAll(
                                FollowSpecification.buildSpecification(filter),
                                pageable);

                if (followsPage.isEmpty()) {
                        return PaginatedDtoResponse.<FollowDTO>builder()
                                        .data(Collections.emptyList())
                                        .totalElements(0L)
                                        .totalPages(0)
                                        .build();
                }

                // Read searchType from filter
                String searchType = filter.getFilters() != null
                                ? (String) filter.getFilters().get("searchType")
                                : null;

                Page<FollowDTO> dtoPage;

                if ("FOLLOWERS".equalsIgnoreCase(searchType)) {
                        // Only return Follower info
                        dtoPage = followsPage.map(f -> FollowDTO.builder()
                                        .id(f.getFollower().getId())
                                        .follower(UserDTO.builder()
                                                        .id(f.getFollower().getId())
                                                        .username(f.getFollower().getUsername())
                                                        .displayName(f.getFollower().getDisplayName())
                                                        .profileUrl(f.getFollower().getProfile() != null
                                                                        ? f.getFollower().getProfile().getUrl()
                                                                        : null)
                                                        .build())
                                        .status(String.valueOf(f.getStatus()))
                                        .createdDate(f.getCreatedDate())
                                        .build());
                } else if ("FOLLOWING".equalsIgnoreCase(searchType)) {
                        // Only return Followee info
                        dtoPage = followsPage.map(f -> FollowDTO.builder()
                                        .id(f.getFollowee().getId())
                                        .followee(UserDTO.builder()
                                                        .id(f.getFollowee().getId())
                                                        .username(f.getFollowee().getUsername())
                                                        .displayName(f.getFollowee().getDisplayName())
                                                        .profileUrl(f.getFollowee().getProfile() != null
                                                                        ? f.getFollowee().getProfile().getUrl()
                                                                        : null)
                                                        .build())
                                        .status(String.valueOf(f.getStatus()))
                                        .createdDate(f.getCreatedDate())
                                        .build());
                } else {
                        // Default (if no searchType) — both sides
                        dtoPage = followsPage.map(this::toDTO);
                }

                return PaginatedResHandler.getPaginatedData(dtoPage);
        }

        // Convert entity to DTO
        private FollowDTO toDTO(Follow follow) {
                return FollowDTO.builder()
                                .id(follow.getId())
                                .follower(UserDTO.builder()
                                                .id(follow.getFollower().getId())
                                                .username(follow.getFollower().getUsername())
                                                .displayName(follow.getFollower().getDisplayName())
                                                .profileUrl(follow.getFollowee().getProfile() != null
                                                                ? follow.getFollowee().getProfile().getUrl()
                                                                : null)
                                                .build())
                                .followee(UserDTO.builder()
                                                .id(follow.getFollowee().getId())
                                                .username(follow.getFollowee().getUsername())
                                                .displayName(follow.getFollowee().getDisplayName())
                                                .profileUrl(follow.getFollowee().getProfile() != null
                                                                ? follow.getFollowee().getProfile().getUrl()
                                                                : null)
                                                .build())
                                .status(String.valueOf(follow.getStatus()))
                                .createdDate(follow.getCreatedDate())
                                .build();
        }

        public boolean isMutual(Integer followerId, Integer followeeId) {
                boolean follower = followRepository.existsByFollowerIdAndFolloweeId(followerId, followeeId);
                boolean following = followRepository.existsByFollowerIdAndFolloweeId(followeeId, followerId);
                return follower && following;
        }

        public List<FollowDTO> getAllFollows() {
                return followRepository.findAll().stream().map(this::toDTO).toList();
        }

}
