package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Notification;
import com.esewa.javabackend.module.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    List<Notification> findByReceiverOrderByCreatedDateDesc(User receiver);

    List<Notification> findByReceiverAndIsReadFalseOrderByCreatedDateDesc(User receiver);


    @Query("SELECT n FROM Notification n WHERE n.receiver.id = :userId ORDER BY n.createdDate DESC")
    List<Notification> findAllByUserId(Integer userId);
}
