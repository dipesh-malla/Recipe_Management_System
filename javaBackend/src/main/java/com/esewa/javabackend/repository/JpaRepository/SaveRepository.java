package com.esewa.javabackend.repository.JpaRepository;


import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.module.Save;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaveRepository extends JpaRepository<Save, Integer> {
    List<Save> findByUserId(Integer userId);
    List<Save> findByUserIdAndResourceType(Integer userId, ResourceType resourceType);
    boolean existsByUserIdAndResourceTypeAndResourceId(Integer userId, ResourceType resourceType, Integer resourceId);
    void deleteByUserIdAndResourceTypeAndResourceId(Integer userId, ResourceType resourceType, Integer resourceId);
}
