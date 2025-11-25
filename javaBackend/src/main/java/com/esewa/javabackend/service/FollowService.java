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
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
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
        private final StringRedisTemplate stringRedisTemplate;
        private final EntityManager entityManager;
        private final FollowSaveHelper followSaveHelper;

        @Transactional
        public FollowDTO followUser(Integer followerId, Integer followeeId) {
                if (Objects.equals(followerId, followeeId))
                        throw new IllegalArgumentException("Cannot follow yourself");

                User follower = userRepository.findById(followerId)
                                .orElseThrow(() -> new RuntimeException("Follower not found"));
                User followee = userRepository.findById(followeeId)
                                .orElseThrow(() -> new RuntimeException("Followee not found"));

                // Check if already following — make this idempotent and return existing follow
                // if present
                Optional<Follow> existingFollow = followRepository.findByFollowerIdAndFolloweeId(followerId,
                                followeeId);
                if (existingFollow.isPresent()) {
                        return followMapper.toDTO(existingFollow.get());
                }

                // Build a follow placeholder — actual persist happens inside a REQUIRES_NEW
                // helper
                Follow follow = Follow.builder()
                                .follower(follower)
                                .followee(followee)
                                .status(FollowStatus.ACTIVE)
                                .isNew(Boolean.TRUE)
                                .build();

                // Persist via helper in a new transaction to avoid corrupting this method's
                // transaction
                com.esewa.javabackend.dto.UserDTO.FollowDTO followDto = null;
                try {
                        followDto = followSaveHelper.saveInNewTransaction(follower.getId(), followee.getId(),
                                        follow.getStatus(), follow.getIsNew());
                        // We still update stats using the entity instances we loaded earlier
                        System.out.println("FollowService: created follow via REQUIRES_NEW id="
                                        + (followDto != null ? followDto.getId() : "null"));
                        updateUserStats(follower, followee, true);
                        // Evict cached home chefs so landing page updates quickly
                        try {
                                if (stringRedisTemplate != null) {
                                        stringRedisTemplate.delete("home:chefs");
                                }
                        } catch (Exception e) {
                                // non-fatal: log and continue
                                System.err.println("Failed to evict home:chefs cache: " + e.getMessage());
                        }
                } catch (Exception e) {
                        String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
                        // If duplicate key likely from sequence out-of-sync, attempt to repair sequence
                        // and retry once
                        if (msg.contains("duplicate key value violates") || msg.contains("follows_pkey")
                                        || msg.contains("duplicate key value")) {
                                try {
                                        System.err.println(
                                                        "FollowService: duplicate-key detected, attempting sequence repair...");
                                        Object seqObj = entityManager
                                                        .createNativeQuery(
                                                                        "SELECT pg_get_serial_sequence('follows','id')")
                                                        .getSingleResult();
                                        if (seqObj != null) {
                                                String seqName = seqObj.toString();
                                                entityManager.createNativeQuery("SELECT setval('" + seqName
                                                                + "', (SELECT COALESCE(MAX(id), 1) FROM follows) + 1, false)")
                                                                .getSingleResult();
                                                // Retry persist in a fresh transaction
                                                com.esewa.javabackend.dto.UserDTO.FollowDTO savedDto = followSaveHelper
                                                                .saveInNewTransaction(follower.getId(),
                                                                                followee.getId(), follow.getStatus(),
                                                                                follow.getIsNew());
                                                followDto = savedDto;
                                                System.out.println(
                                                                "FollowService: after sequence repair, created follow id="
                                                                                + (followDto != null ? followDto.getId()
                                                                                                : "null"));
                                                updateUserStats(follower, followee, true);
                                                try {
                                                        if (stringRedisTemplate != null) {
                                                                stringRedisTemplate.delete("home:chefs");
                                                        }
                                                } catch (Exception ex) {
                                                        System.err.println("Failed to evict home:chefs cache: "
                                                                        + ex.getMessage());
                                                }
                                        } else {
                                                throw new IllegalStateException("Failed to create follow relationship: "
                                                                + e.getMessage());
                                        }
                                } catch (Exception ex) {
                                        // If after repair the follow already exists, return existing follow instead of
                                        // error
                                        Optional<Follow> postCheck = followRepository
                                                        .findByFollowerIdAndFolloweeId(followerId, followeeId);
                                        if (postCheck.isPresent()) {
                                                return followMapper.toDTO(postCheck.get());
                                        }
                                        throw new IllegalStateException(
                                                        "Failed to create follow relationship: " + ex.getMessage());
                                }
                        }

                        // For other errors, re-check if relationship exists and return idempotent
                        // response
                        Optional<Follow> postCheck = followRepository.findByFollowerIdAndFolloweeId(followerId,
                                        followeeId);
                        if (postCheck.isPresent()) {
                                return followMapper.toDTO(postCheck.get());
                        }

                        throw new IllegalStateException("Failed to create follow relationship: " + e.getMessage());
                }

                // After following, check if mutual follow exists
                if (followRepository.existsByFollowerAndFollowee(followee, follower)) {
                        createConversationIfNotExists(follower, followee);
                }

                // Send notification and interaction events — failures here should not break the
                // follow flow
                try {
                        notificationProducer.sendNotification(NotificationEvent.builder()
                                        .senderId(followerId)
                                        .receiverId(followeeId)
                                        .type(NotificationType.FOLLOW)
                                        .message(follower.getUsername() + " started following you")
                                        .referenceId(followeeId)
                                        .build());
                } catch (Exception ex) {
                        System.err.println("Failed to send notification event: " + ex.getMessage());
                }

                try {
                        interactionProducer.sendInteraction(
                                        InteractionEvent.builder()
                                                        .userId(follower.getId())
                                                        .resourceType(ResourceType.USER)
                                                        .resourceId(followee.getId())
                                                        .action(InteractionAction.FOLLOW)
                                                        .value(4.0)
                                                        .build());
                } catch (Exception ex) {
                        System.err.println("Failed to send interaction event: " + ex.getMessage());
                }

                // Return the DTO produced inside the REQUIRES_NEW transaction if available,
                // otherwise map the entity we have (fallback).
                if (followDto != null) {
                        return followDto;
                }

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
                // Evict cached home chefs so landing page updates quickly
                try {
                        if (stringRedisTemplate != null) {
                                stringRedisTemplate.delete("home:chefs");
                        }
                } catch (Exception e) {
                        System.err.println("Failed to evict home:chefs cache: " + e.getMessage());
                }
        }

        @Transactional
        public List<FollowerDTO> getFollowersOfUser(Integer userId) {
                List<Follow> followers = followRepository.findByFolloweeId(userId);
                return followers.stream()
                                .map(f -> {
                                        var u = f.getFollower();
                                        String profileUrl = (u.getProfile() != null && u.getProfile().getUrl() != null)
                                                        ? u.getProfile().getUrl()
                                                        : String.format("https://i.pravatar.cc/150?u=%s",
                                                                        u.getUsername());
                                        return FollowerDTO.builder()
                                                        .id(u.getId())
                                                        .username(u.getUsername())
                                                        .displayName(u.getDisplayName())
                                                        .profile(profileUrl)
                                                        .build();
                                })
                                .toList();
        }

        @Transactional
        public List<FollowerDTO> getFollowing(Integer userId) {
                List<Follow> followers = followRepository.findByFollowerId(userId);
                return followers.stream()
                                .map(f -> {
                                        var u = f.getFollowee();
                                        String profileUrl = (u.getProfile() != null && u.getProfile().getUrl() != null)
                                                        ? u.getProfile().getUrl()
                                                        : String.format("https://i.pravatar.cc/150?u=%s",
                                                                        u.getUsername());
                                        return FollowerDTO.builder()
                                                        .id(u.getId())
                                                        .username(u.getUsername())
                                                        .displayName(u.getDisplayName())
                                                        .profile(profileUrl)
                                                        .build();
                                })
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
                                                .profileUrl(follow.getFollower().getProfile() != null
                                                                ? follow.getFollower().getProfile().getUrl()
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
