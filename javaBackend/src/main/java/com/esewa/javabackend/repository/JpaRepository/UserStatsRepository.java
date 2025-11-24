package com.esewa.javabackend.repository.JpaRepository;

import aj.org.objectweb.asm.commons.Remapper;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.module.UserStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserStatsRepository extends JpaRepository<UserStats, Integer>, JpaSpecificationExecutor<UserStats> {
    Optional<UserStats> findByUser(User follower);

    Optional<UserStats> findByUserId(Integer userId);
}
