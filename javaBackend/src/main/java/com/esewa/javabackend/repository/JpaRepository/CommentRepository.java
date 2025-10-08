package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Comment;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Integer> {
    List<Comment> findByPostIdAndParentIsNull(Integer postId, Sort sort);
}
