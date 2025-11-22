package com.esewa.javabackend.service;

import com.esewa.javabackend.config.kafka.InteractionProducer;
import com.esewa.javabackend.config.kafka.NotificationProducer;
import com.esewa.javabackend.dto.ReactionDTO;
import com.esewa.javabackend.dto.RecipeCommentDTO;
import com.esewa.javabackend.dto.RecipeReactionDTO;
import com.esewa.javabackend.dto.event.InteractionEvent;
import com.esewa.javabackend.dto.event.NotificationEvent;
import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.NotificationType;
import com.esewa.javabackend.enums.ReactionType;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.mapper.ReactionMapper;
import com.esewa.javabackend.mapper.RecipeCommentMapper;
import com.esewa.javabackend.module.*;
import com.esewa.javabackend.repository.JpaRepository.RecipeCommentRepository;
import com.esewa.javabackend.repository.JpaRepository.RecipeReactionRepository;
import com.esewa.javabackend.repository.JpaRepository.RecipeRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RecipeCommentReactionService {

    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final RecipeCommentRepository commentRepository;
    private final RecipeCommentMapper commentMapper;
    private final InteractionProducer interactionProducer;
    private final RecipeReactionRepository recipeReactionRepository;
    private final NotificationProducer notificationProducer;
    private final ReactionMapper reactionMapper;

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
                        .isNew(true)
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


    @Transactional
    public RecipeReactionDTO addReaction(RecipeReactionDTO reactionDTO) {

        Recipe recipe = recipeRepository.findById(reactionDTO.getRecipeId())
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

        User user = userRepository.findById(reactionDTO.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if the user already reacted to this post
        RecipeReaction reaction = recipeReactionRepository.findByRecipeIdAndUserId(recipe.getId(), user.getId())
                .orElse(RecipeReaction.builder()
                        .recipe(recipe)
                        .user(user)
                        .build());

        // Set or update the type
        reaction.setType(ReactionType.valueOf(reactionDTO.getType()));
        reaction = recipeReactionRepository.save(reaction);

        if (!user.getId().equals(recipe.getAuthor().getId())) {
            notificationProducer.sendNotification(NotificationEvent.builder()
                    .senderId(user.getId())
                    .receiverId(recipe.getAuthor().getId())
                    .type(NotificationType.POST_REACTION)
                    .message(user.getUsername() + " " + reactionDTO.getType().toLowerCase() + "d your post")
                    .referenceId(recipe.getId())
                    .build());
        }
//        interactionService.logInteraction(
//                user,
//                ResourceType.POST,
//                reactionDTO.getPostId(),
//                InteractionAction.CLICK,
//                1.0
//        );

        interactionProducer.sendInteraction(
                InteractionEvent.builder()
                        .userId(user.getId())
                        .resourceType(ResourceType.POST)
                        .resourceId(recipe.getId())
                        .action(InteractionAction.LIKE)
                        .value(2.0)
                        .isNew(true)
                        .build()
        );

        reactionDTO.setId(reaction.getId());
        return reactionDTO;
    }


    public List<RecipeReactionDTO> getReactionsByRecipe(Integer recipeId) {
        return recipeReactionRepository.findAll().stream().map(reactionMapper::toDTO).toList();
    }


}
