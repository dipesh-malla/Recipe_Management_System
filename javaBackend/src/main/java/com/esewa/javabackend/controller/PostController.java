package com.esewa.javabackend.controller;


import com.esewa.javabackend.config.CustomMessageSource;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final CustomMessageSource messageSource;

    @PostMapping
    public GlobalApiResponse<UUID> createPost(@RequestBody PostDTO postDTO) {
        UUID id = postService.savePost(postDTO);
        return GlobalApiResponse.<UUID>builder()
                .success(true)
                .responseCode("200")
                .message(messageSource.getMessage(Messages.SUCCESS.getCode()))
                .data(id)
                .build();
    }

    @GetMapping
    public GlobalApiResponse<List<PostDTO>> getAllPosts(@RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "10") int size) {
        List<PostDTO> posts = postService.getAllPosts(page, size);
        return GlobalApiResponse.<List<PostDTO>>builder()
                .success(true)
                .responseCode("200")
                .message(messageSource.getMessage(Messages.SUCCESS.getCode()))
                .data(posts)
                .build();
    }

    @GetMapping("/{id}")
    public GlobalApiResponse<PostDTO> getPostById(@PathVariable UUID id) {
        PostDTO postDTO = postService.getPostById(id);
        return GlobalApiResponse.<PostDTO>builder()
                .success(true)
                .responseCode("200")
                .message(messageSource.getMessage(Messages.SUCCESS.getCode()))
                .data(postDTO)
                .build();
    }

    @DeleteMapping("/{id}")
    public GlobalApiResponse<Boolean> deletePost(@PathVariable UUID id) {
        boolean deleted = postService.deletePost(id);
        return GlobalApiResponse.<Boolean>builder()
                .success(deleted)
                .responseCode("200")
                .message(deleted ? messageSource.getMessage(Messages.SUCCESS.getCode()) : "Failed")
                .data(deleted)
                .build();
    }
}

