package com.esewa.javabackend.controller;


import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiRequest;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.service.PostService;
import com.esewa.javabackend.utils.ApiConstants;
import com.esewa.javabackend.utils.AppConstants;
import com.esewa.javabackend.utils.SearchFilter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController extends BaseController {

    private final PostService postService;

    @PostMapping
    public ResponseEntity<GlobalApiResponse<Integer>> savePost(
            @RequestBody @Valid GlobalApiRequest<PostDTO> postReq
            ) {
        return ResponseEntity.ok(
                successResponse(
                        postService.savePost(postReq.getData()),
                        Messages.SUCCESS,
                        "Post saved"
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<?>> getPostById(
            @PathVariable Integer id
            ) {
        return ResponseEntity.ok(
                successResponse(
                        postService.getPostById(id),
                        Messages.SUCCESS,
                        "Post fetched"
                )
        );
    }

    @GetMapping("/filter")
    public ResponseEntity<GlobalApiResponse<?>> getAllPosts(
            @RequestBody @Valid GlobalApiRequest<SearchFilter> filterReq
            ) {
        return ResponseEntity.ok(
                successResponse(
                        postService.getAllPosts(filterReq.getData()),
                        Messages.SUCCESS,
                        "Posts fetched"
                )
        );
    }

    @GetMapping
    public ResponseEntity<List<Post>> getAllPosts(){
        return ResponseEntity.ok(postService.fetchAllPosts());
    }

//    @PostMapping(ApiConstants.Generic.TOGGLE_DATA)
//    public ResponseEntity<GlobalApiResponse<?>> togglePost(
//            @RequestBody @Valid GlobalApiRequest<IDRequest> idRequest
//            ) {
//        return ResponseEntity.ok(
//                successResponse(
//                        postService.togglePost(idRequest.getData().getId()),
//                        Messages.SUCCESS,
//                        "Post deleted"
//                )
//        );
//    }
}

