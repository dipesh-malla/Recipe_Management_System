package com.esewa.javabackend.service;

import com.esewa.javabackend.enums.FollowStatus;
import com.esewa.javabackend.module.Follow;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.FollowRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import com.esewa.javabackend.dto.UserDTO.FollowDTO;
import com.esewa.javabackend.mapper.FollowMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Helper that creates a new Follow in a fresh transaction.
 * This avoids re-using an entity instance attached to a previous persistence
 * context
 * which can cause "null identifier" errors after a session flush/exception.
 */
@Component
@RequiredArgsConstructor
public class FollowSaveHelper {

  private final FollowRepository followRepository;
  private final UserRepository userRepository;
  private final FollowMapper followMapper;

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public FollowDTO saveInNewTransaction(Integer followerId, Integer followeeId, FollowStatus status, Boolean isNew) {
    // Re-fetch entities inside the new transaction to ensure all lazy associations
    // that will be serialized to the client are initialized within an active
    // session.
    User followerRef = userRepository.findById(followerId)
        .orElseThrow(() -> new RuntimeException("Follower not found in REQUIRES_NEW"));
    User followeeRef = userRepository.findById(followeeId)
        .orElseThrow(() -> new RuntimeException("Followee not found in REQUIRES_NEW"));

    Follow fresh = Follow.builder()
        .follower(followerRef)
        .followee(followeeRef)
        .status(status != null ? status : FollowStatus.ACTIVE)
        .isNew(isNew != null ? isNew : Boolean.TRUE)
        .build();

    Follow saved = followRepository.save(fresh);

    // Map to DTO inside the same transaction so any lazy fields (profile, etc.) are
    // available
    return followMapper.toDTO(saved);
  }
}
