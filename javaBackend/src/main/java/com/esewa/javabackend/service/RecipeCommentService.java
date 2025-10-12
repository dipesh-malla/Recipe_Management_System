package com.esewa.javabackend.service;

import com.esewa.javabackend.config.kafka.InteractionProducer;
import com.esewa.javabackend.dto.CommentDTO;
import com.esewa.javabackend.dto.RecipeCommentDTO;
import com.esewa.javabackend.dto.event.InteractionEvent;
import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.mapper.RecipeCommentMapper;
import com.esewa.javabackend.module.Comment;
import com.esewa.javabackend.module.Recipe;
import com.esewa.javabackend.module.RecipeComment;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.RecipeCommentRepository;
import com.esewa.javabackend.repository.JpaRepository.RecipeRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RecipeCommentService {

    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final RecipeCommentRepository commentRepository;
    private final RecipeCommentMapper commentMapper;
    private final InteractionProducer interactionProducer;

    public RecipeCommentDTO addComment(RecipeCommentDTO dto) {
        if (dto == null) throw new IllegalArgumentException("RecipeDTO cannot be null");

        Recipe recipe = recipeRepository.findById(dto.getRecipeId())
                .orElseThrow(() -> new RuntimeException("Recipe not found"));
        User author = userRepository.findById(dto.getAuthorId())
                .orElseThrow(() -> new RuntimeException("User not found"));

//        RecipeComment recipeComment = new RecipeComment();
//        recipeComment.setBody(dto.getBody());

        RecipeComment comment = commentMapper.toEntity(dto);
        comment.setRecipe(recipe);
        comment.setAuthor(author);

        if (dto.getParentId() != null) {
            RecipeComment parent = commentRepository.findById(dto.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            comment.setParent(parent);
        }

        RecipeComment saved = commentRepository.save(comment);

        interactionProducer.sendInteraction(
                InteractionEvent.builder()
                        .userId(author.getId())
                        .resourceType(ResourceType.RECIPE)
                        .resourceId(recipe.getId())
                        .action(InteractionAction.COMMENT)
                        .value(3.0)
                        .build()
        );
        return commentMapper.toDTO(saved);
    }

    public List<RecipeCommentDTO> getCommentsByRecipe(Integer recipeId) {
        return commentRepository.findByRecipeIdAndParentIsNull(recipeId)
                .stream()
                .map(commentMapper::toDTO)
                .toList();
    }

//    @Transactional
//    public List<CommentDTO> getCommentsByPost(Integer postId) {
//        List<Comment> rootComments = commentRepository.findByPostIdAndParentIsNull(postId, Sort.by(Sort.Direction.ASC, "createdAt"));
//        return rootComments.stream()
//                .map(this::mapWithReplies)
//                .collect(Collectors.toList());
//    }
//
//    private CommentDTO mapWithReplies(Comment comment) {
//        CommentDTO dto = commentMapper.toDTO(comment);
//        Set<CommentDTO> replies = comment.getReplies().stream()
//                .map(this::mapWithReplies)
//                .collect(Collectors.toSet());
//        dto.setReplies(replies);
//        return dto;
//    }
}
