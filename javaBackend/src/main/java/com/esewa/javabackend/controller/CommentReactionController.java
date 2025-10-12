package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.CommentDTO;
import com.esewa.javabackend.dto.ReactionDTO;
import com.esewa.javabackend.dto.RecipeCommentDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.mapper.RecipeCommentMapper;
import com.esewa.javabackend.module.Message;
import com.esewa.javabackend.service.CommentReactionService;
import com.esewa.javabackend.service.RecipeCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequestMapping("/api/posts")
@RestController
@RequiredArgsConstructor
public class CommentReactionController extends BaseController {
    private final CommentReactionService commentReactionService;
    private final RecipeCommentService  recipeCommentService;

    @PostMapping("/{postId}/comments")
    public ResponseEntity<GlobalApiResponse<CommentDTO>> addComment(
            @PathVariable Integer postId,
            @RequestBody CommentDTO commentDTO) {

        commentDTO.setPostId(postId);

        return ResponseEntity.ok(successResponse(
                commentReactionService.addComment(commentDTO),
                Messages.SUCCESS,
                "Comment added successfully"
        ));
    }

    @GetMapping("/post/{postId}")
    public ResponseEntity<GlobalApiResponse<List<CommentDTO>>> getCommentsByPost(
            @PathVariable Integer postId
    ) {
        List<CommentDTO> comments = commentReactionService.getCommentsByPost(postId);
        return ResponseEntity.ok(successResponse(comments, Messages.SUCCESS ,"Comments fetched successfully"));
    }




    @PostMapping("/{postId}/reactions")
    public ResponseEntity<GlobalApiResponse<ReactionDTO>> addReaction(
            @PathVariable Integer postId,
            @RequestBody ReactionDTO reactionDTO
    ){
        reactionDTO.setPostId(postId);
        return ResponseEntity.ok(successResponse(
                commentReactionService.addReaction(reactionDTO),
                Messages.SUCCESS,
                "Reaction added successfully"

        ));

    }


//    @PostMapping("/{recipeId}/reactions")
//    public ResponseEntity<GlobalApiResponse<ReactionDTO>> addRecipeReaction(
//            @PathVariable Integer recipeId,
//            @RequestBody RecipeCommentDTO reactionDTO
//    ){
//        reactionDTO.setPostId(postId);
//        return ResponseEntity.ok(successResponse(
//                commentReactionService.addReaction(reactionDTO),
//                Messages.SUCCESS,
//                "Reaction added successfully"
//
//        ));
//
//    }


}
