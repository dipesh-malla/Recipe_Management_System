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
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Slf4j
public class PostController extends BaseController {

        private final PostService postService;

        /**
         * Create/Update post with media
         * Multipart: profile/post images/videos
         */
        @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public ResponseEntity<GlobalApiResponse<Integer>> savePost(
                        @RequestPart("post") String postJson,
                        @RequestPart(value = "files", required = false) List<MultipartFile> files) {
                ObjectMapper mapper = new ObjectMapper();
                // Be permissive to allow clients that send unquoted field names or single
                // quotes
                mapper.configure(JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES, true);
                mapper.configure(JsonParser.Feature.ALLOW_SINGLE_QUOTES, true);

                try {
                        // strip optional UTF-8 BOM and trim whitespace (clients/file uploads may
                        // include BOM)
                        if (postJson != null && !postJson.isEmpty()) {
                                postJson = postJson.replace("\uFEFF", "").trim();
                        }

                        PostDTO postDTO = mapper.readValue(postJson, PostDTO.class);
                        try {
                                Integer id = postService.savePostWithMedia(postDTO, files);
                                return ResponseEntity.ok(successResponse(id, Messages.SUCCESS, "Post saved"));
                        } catch (Exception e) {
                                // Log full stacktrace for debugging and return a clearer error
                                log.error("Error saving post", e);
                                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                                .body(errorResponse("Failed to save post: " + e.getMessage(),
                                                                HttpStatus.INTERNAL_SERVER_ERROR));
                        }
                } catch (JsonProcessingException e) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                        .body(errorResponse("Invalid JSON in 'post' part: " + e.getOriginalMessage(),
                                                        HttpStatus.BAD_REQUEST));
                }
        }

        @GetMapping("/{id}")
        public ResponseEntity<GlobalApiResponse<PostResponseDTO>> getPostById(@PathVariable Integer id) {
                return ResponseEntity.ok(
                                successResponse(
                                                postService.getPostResponseById(id),
                                                Messages.SUCCESS,
                                                "Post fetched"));
        }

        @GetMapping
        public ResponseEntity<GlobalApiResponse<List<PostResponseDTO>>> getAllPosts() {
                return ResponseEntity.ok(successResponse(
                                postService.fetchAllPosts(),
                                Messages.SUCCESS,
                                "All posts fetched"));
        }

        @PostMapping("/filter")
        public ResponseEntity<GlobalApiResponse<PaginatedDtoResponse<PostResponseDTO>>> getAllPostsByFilter(
                        @RequestBody String filterJson) {
                ObjectMapper mapper = new ObjectMapper();
                mapper.configure(JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES, true);
                mapper.configure(JsonParser.Feature.ALLOW_SINGLE_QUOTES, true);

                try {
                        if (filterJson != null && !filterJson.isEmpty()) {
                                filterJson = filterJson.replace("\uFEFF", "").trim();
                        }
                        GlobalApiRequest<SearchFilter> filterReq = mapper.readValue(filterJson,
                                        mapper.getTypeFactory().constructParametricType(GlobalApiRequest.class,
                                                        SearchFilter.class));

                        return ResponseEntity.ok(successResponse(
                                        postService.getAllPosts(filterReq.getData()),
                                        Messages.SUCCESS,
                                        "Users fetched"));
                } catch (JsonProcessingException e) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                        .body(errorResponse("Invalid JSON in request body: " + e.getOriginalMessage(),
                                                        HttpStatus.BAD_REQUEST));
                }
        }

        @DeleteMapping("/delete")
        public ResponseEntity<GlobalApiResponse> deletePostById(@RequestParam Integer id) {
                return ResponseEntity.ok(successResponse(
                                postService.deletePost(id),
                                Messages.SUCCESS,
                                "Post deleted"));
        }

        @GetMapping("/byUserId/{userId}")
        public ResponseEntity<GlobalApiResponse<List<PostResponseDTO>>> getPostsByUserId(@PathVariable Integer userId) {
                return ResponseEntity.ok(successResponse(
                                postService.findPostByUserId(userId),
                                Messages.SUCCESS,
                                "Post fetched"));
        }

        @GetMapping("/reelVideos")
        public ResponseEntity<GlobalApiResponse<List<PostResponseDTO>>> getAllRealVideo() {
                return ResponseEntity.ok(successResponse(
                                postService.getAllReelVideos(),
                                Messages.SUCCESS,
                                "Reels Featched"));
        }

        @GetMapping("/postWithImage")
        public ResponseEntity<GlobalApiResponse<List<PostResponseDTO>>> getPostsOnlyImage() {
                return ResponseEntity.ok(successResponse(
                                postService.getAllPostImage(),
                                Messages.SUCCESS,
                                "Reels Featched"));
        }

}
