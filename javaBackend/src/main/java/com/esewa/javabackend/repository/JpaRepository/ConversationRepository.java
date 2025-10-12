package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Conversation;
import com.esewa.javabackend.module.User;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Integer> {

    @Query("SELECT c FROM Conversation c JOIN c.participants p1 JOIN c.participants p2 " +
            "WHERE p1.id = :user1Id AND p2.id = :user2Id")
    Optional<Conversation> findBetweenUsers(@Param("user1Id") Integer user1Id, @Param("user2Id") Integer user2Id);

    @Query("SELECT DISTINCT c FROM Conversation c " +
            "JOIN FETCH c.participants p " +
            "WHERE :user MEMBER OF c.participants")
    List<Conversation> findAllByUserId(@Param("userId") Integer userId);

    @Query("SELECT DISTINCT c FROM Conversation c " +
            "JOIN FETCH c.participants p " +
            "WHERE :user MEMBER OF c.participants")
    List<Conversation> findAllByUser(@Param("user") User user);


    @Query("""
        SELECT c FROM Conversation c 
        JOIN c.participants p1 
        JOIN c.participants p2 
        WHERE p1 = :user1 AND p2 = :user2
    """)
    Optional<Conversation> findPrivateConversation(User user1, User user2);
}

