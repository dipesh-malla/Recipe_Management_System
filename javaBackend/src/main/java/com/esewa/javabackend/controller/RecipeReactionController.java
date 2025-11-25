package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.ReactionDTO;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.enums.NotificationType;
import com.esewa.javabackend.enums.ReactionType;
import com.esewa.javabackend.module.Reaction;
import com.esewa.javabackend.module.Recipe;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.ReactionRepository;
import com.esewa.javabackend.repository.JpaRepository.RecipeRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import com.esewa.javabackend.config.kafka.NotificationProducer;
import com.esewa.javabackend.config.kafka.InteractionProducer;
import com.esewa.javabackend.dto.event.InteractionEvent;
import com.esewa.javabackend.dto.event.NotificationEvent;
import com.esewa.javabackend.enums.InteractionAction;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/recipe-reactions")
@RequiredArgsConstructor
public class RecipeReactionController extends BaseController {

  private final ReactionRepository reactionRepository;
  private final RecipeRepository recipeRepository;
  private final UserRepository userRepository;
  private final NotificationProducer notificationProducer;
  private final InteractionProducer interactionProducer;

  @PostMapping("/like")
  public ResponseEntity<GlobalApiResponse<ReactionDTO>> likeRecipe(@RequestBody java.util.Map<String, Object> body) {
    try {
      Integer recipeId = (Integer) (body.get("recipeId") instanceof Integer ? body.get("recipeId")
          : Integer.parseInt(String.valueOf(body.get("recipeId"))));
      String reactionType = String.valueOf(body.get("reactionType"));
      Integer userId = null;
      if (body.containsKey("userId") && body.get("userId") != null) {
        userId = (Integer) (body.get("userId") instanceof Integer ? body.get("userId")
            : Integer.parseInt(String.valueOf(body.get("userId"))));
      }
      // Fallback to anonymous/development user 1 if not provided
      if (userId == null)
        userId = 1;

      Recipe recipe = recipeRepository.findById(recipeId).orElse(null);
      if (recipe == null) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
            .body(errorResponse("Recipe not found", org.springframework.http.HttpStatus.NOT_FOUND));
      }

      User user = userRepository.findById(userId).orElse(null);
      if (user == null) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
            .body(errorResponse("User not found", org.springframework.http.HttpStatus.NOT_FOUND));
      }

      Optional<Reaction> maybe = reactionRepository.findByRecipeIdAndUserId(recipeId, userId);
      Reaction reaction = maybe.orElse(Reaction.builder().recipe(recipe).user(user).build());
      reaction.setType(ReactionType.valueOf(reactionType));
      reaction = reactionRepository.save(reaction);

      if (!user.getId().equals(recipe.getAuthor().getId())) {
        try {
          notificationProducer.sendNotification(NotificationEvent.builder()
              .senderId(user.getId())
              .receiverId(recipe.getAuthor().getId())
              .type(NotificationType.POST_REACTION)
              .message(user.getUsername() + " " + reactionType.toLowerCase() + "d your recipe")
              .referenceId(recipe.getId())
              .build());
        } catch (Exception ignored) {
          // Swallow notification errors so they don't break the API
        }
      }

      try {
        interactionProducer.sendInteraction(
            InteractionEvent.builder()
                .userId(user.getId())
                .resourceType(com.esewa.javabackend.enums.ResourceType.RECIPE)
                .resourceId(recipe.getId())
                .action(InteractionAction.LIKE)
                .value(2.0)
                .build());
      } catch (Exception ignored) {
        // Swallow interaction producer errors
      }

      ReactionDTO dto = new ReactionDTO();
      dto.setId(reaction.getId());
      dto.setPostId(null);
      dto.setUserId(user.getId());
      dto.setType(reaction.getType().name());

      return ResponseEntity.ok(successResponse(dto, Messages.SUCCESS, "Reaction recorded"));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(errorResponse("Failed to like recipe: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<GlobalApiResponse<?>> deleteReaction(@PathVariable Integer id) {
    try {
      reactionRepository.deleteById(id);
      return ResponseEntity.ok(successResponse(null, Messages.SUCCESS, "Reaction removed"));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(errorResponse("Failed to delete reaction: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}
