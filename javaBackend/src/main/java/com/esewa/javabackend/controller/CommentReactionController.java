package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.CommentDTO;
import com.esewa.javabackend.dto.ReactionDTO;
import com.esewa.javabackend.dto.RecipeCommentDTO;
import com.esewa.javabackend.dto.RecipeReactionDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.CommentReactionService;
import com.esewa.javabackend.service.RecipeCommentReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequestMapping("/api")
@RestController
@RequiredArgsConstructor
public class CommentReactionController extends BaseController {
    private final CommentReactionService commentReactionService;
    private final RecipeCommentReactionService recipeCommentReactionService;

    @PostMapping("/post/comments")
    public ResponseEntity<GlobalApiResponse<CommentDTO>> addPostComment(
            @RequestBody CommentDTO commentDTO) {


        return ResponseEntity.ok(successResponse(
                commentReactionService.addComment(commentDTO),
                Messages.SUCCESS,
                "Comment added successfully"
        ));
    }

    @GetMapping("/post/comments/{postId}")
    public ResponseEntity<GlobalApiResponse<List<CommentDTO>>> getCommentsByPost(
            @PathVariable Integer postId
    ) {
        List<CommentDTO> comments = commentReactionService.getCommentsByPost(postId);
        return ResponseEntity.ok(successResponse(comments, Messages.SUCCESS ,"Comments fetched successfully"));
    }




    @PostMapping("/post/reactions")
    public ResponseEntity<GlobalApiResponse<ReactionDTO>> addPostReaction(
            @RequestBody ReactionDTO reactionDTO
    ){
        reactionDTO.setPostId(reactionDTO.getPostId());
        return ResponseEntity.ok(successResponse(
                commentReactionService.addReaction(reactionDTO),
                Messages.SUCCESS,
                "Reaction added successfully"

        ));

    }

    @GetMapping("/post/reactions/{postId}")
    public ResponseEntity<GlobalApiResponse<List<ReactionDTO>>> getReactionsByPost(
            @PathVariable Integer postId
    ){
        return ResponseEntity.ok(successResponse(
                commentReactionService.getReactionByPost(postId),
                Messages.SUCCESS,
                "Reactions by post"
        ));
    }




// recipe reaction and comment apis
@PostMapping("/recipe/comments")
public ResponseEntity<GlobalApiResponse<?>> addRecipeComment(@RequestBody RecipeCommentDTO recipeCommentDTO) {

    return ResponseEntity.ok(successResponse(
            recipeCommentReactionService.addComment(recipeCommentDTO),
            Messages.SUCCESS,
            "Comment added"
    ));
}

    @GetMapping("recipe/comment/{recipeId}")
    public ResponseEntity<GlobalApiResponse<?>> getRecipeCommentById(@PathVariable Integer recipeId) {
        return ResponseEntity.ok(
                successResponse(
                        recipeCommentReactionService.getCommentsByRecipe(recipeId),
                        Messages.SUCCESS,
                        "Comment fetched"
                )
        );
    }

//    @PostMapping("/recipe/{recipeId}")
@PostMapping("/recipe/reactions")
public ResponseEntity<GlobalApiResponse<?>> addRecipeReaction(@RequestBody RecipeReactionDTO recipeReacitonDTO) {

    return ResponseEntity.ok(successResponse(
            recipeCommentReactionService.addReaction(recipeReacitonDTO),
            Messages.SUCCESS,
            "Comment added"
    ));
}

    @GetMapping("recipe/reaction/{recipeId}")
    public ResponseEntity<GlobalApiResponse<?>> getRecipeReactionsById(@PathVariable Integer recipeId) {
        return ResponseEntity.ok(
                successResponse(
                        recipeCommentReactionService.getReactionsByRecipe(recipeId),
                        Messages.SUCCESS,
                        "Comment fetched"
                )
        );
    }


}
