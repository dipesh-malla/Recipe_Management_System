package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Follow;
import com.esewa.javabackend.module.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Integer>, JpaSpecificationExecutor<Follow> {
    boolean existsByFollowerAndFollowee(User follower, User followee);
    Optional<Follow> findByFollowerIdAndFolloweeId(Integer followerId, Integer followeeId);
    List<Follow> findAllByFolloweeId(Integer followeeId);
    List<Follow> findAllByFollowerId(Integer followerId);

    List<Follow> findByFolloweeId(Integer userId);

    List<Follow> findByFollowerId(Integer userId);

    boolean existsByFollowerIdAndFolloweeId(Integer followerId, Integer followeeId);
}
