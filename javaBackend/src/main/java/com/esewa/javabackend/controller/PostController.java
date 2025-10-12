package com.esewa.javabackend.controller;


import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiRequest;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.dto.postDTO.PostResponseDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.PostService;
import com.esewa.javabackend.utils.SearchFilter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController extends BaseController {

    private final PostService postService;

    /**
     * Create/Update post with media
     * Multipart: profile/post images/videos
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GlobalApiResponse<Integer>> savePost(
            @RequestPart("post") String postJson,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) throws JsonProcessingException {

        PostDTO postDTO = new ObjectMapper().readValue(postJson, PostDTO.class);

        return ResponseEntity.ok(
                successResponse(
                        postService.savePostWithMedia(postDTO, files),
                        Messages.SUCCESS,
                        "Post saved"
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<PostResponseDTO>> getPostById(@PathVariable Integer id) {
        return ResponseEntity.ok(
                successResponse(
                        postService.getPostResponseById(id),
                        Messages.SUCCESS,
                        "Post fetched"
                )
        );
    }

    @GetMapping
    public ResponseEntity<GlobalApiResponse<List<PostResponseDTO>>> getAllPosts() {
        return ResponseEntity.ok(successResponse(
                postService.fetchAllPosts(),
                Messages.SUCCESS,
                "All posts fetched"
        ));
    }

    @GetMapping("/filter")
    public ResponseEntity<GlobalApiResponse<PaginatedDtoResponse<PostResponseDTO>>> getAllPostsByFilter(
            @RequestBody GlobalApiRequest<SearchFilter> filterReq) {
        return ResponseEntity.ok(successResponse(
                postService.getAllPosts(filterReq.getData()),
                Messages.SUCCESS,
                "Users fetched"
        ));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<GlobalApiResponse> deletePostById(@RequestParam Integer id) {
        return ResponseEntity.ok(successResponse(
                postService.deletePost(id),
                Messages.SUCCESS,
                "Post deleted"
        ));
    }

    @GetMapping("/byUserId/{userId}")
    public ResponseEntity<GlobalApiResponse<List<PostResponseDTO>>> getPostsByUserId(@PathVariable Integer userId) {
        return ResponseEntity.ok(successResponse(
                postService.findPostByUserId(userId),
                Messages.SUCCESS,
                "Post fetched"
        ));
    }

    @GetMapping("/reelVideos")
    public ResponseEntity<GlobalApiResponse<List<PostResponseDTO>>> getAllRealVideo() {
        return ResponseEntity.ok(successResponse(
                postService.getAllReelVideos(),
                Messages.SUCCESS,
                "Reels Featched"
        ));
    }

    @GetMapping("/postWithImage")
    public ResponseEntity<GlobalApiResponse<List<PostResponseDTO>>> getPostsOnlyImage() {
        return ResponseEntity.ok(successResponse(
                postService.getAllPostImage(),
                Messages.SUCCESS,
                "Reels Featched"
        ));
    }

}
