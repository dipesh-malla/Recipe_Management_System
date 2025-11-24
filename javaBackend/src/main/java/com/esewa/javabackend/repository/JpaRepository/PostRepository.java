package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Media;
import com.esewa.javabackend.module.Post;
import io.lettuce.core.ScanIterator;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, Integer>, JpaSpecificationExecutor<Post> {

    @Query("SELECT p FROM Post p WHERE p.author.id = :userId ORDER BY p.createdDate DESC")
    List<Post> findAllByUserId(Integer userId);

    @Query("SELECT DISTINCT p FROM Post p JOIN p.medias m WHERE m.type = :type ORDER BY p.createdDate DESC")
    List<Post> findPostsByMediaType(@Param("type") com.esewa.javabackend.enums.MediaType type);

}
