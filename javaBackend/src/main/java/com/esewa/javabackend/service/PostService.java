package com.esewa.javabackend.service;

import com.esewa.javabackend.config.CustomMessageSource;
import com.esewa.javabackend.config.kafka.InteractionProducer;
import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.dto.CommentDTO;
import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.dto.event.InteractionEvent;
import com.esewa.javabackend.dto.postDTO.PostResponseDTO;
import com.esewa.javabackend.enums.*;
import com.esewa.javabackend.mapper.PostMapper;
import com.esewa.javabackend.module.Media;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.repository.JpaRepository.MediaRepository;
import com.esewa.javabackend.repository.JpaRepository.PostRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import com.esewa.javabackend.service.AIML.InteractionService;
import com.esewa.javabackend.utils.AppConstants;
import com.esewa.javabackend.utils.AppUtil;
import com.esewa.javabackend.utils.PaginatedResHandler;
import com.esewa.javabackend.utils.SearchFilter;
import com.esewa.javabackend.utils.specification.PostSpecification;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final MediaRepository mediaRepository;
    private final PostMapper postMapper;
    private final FileStorageService fileStorageService;
    private final CustomMessageSource messageSource;
    private final InteractionService interactionService;
    private final InteractionProducer interactionProducer;

    private final String className = this.getClass().getName();

    /**
     * Save or update post with optional media files
     */
    @Transactional
    public Integer savePostWithMedia(PostDTO postDTO, List<MultipartFile> files) {
        log.info("{} - {} - Request: {}", className, AppUtil.getMethodName(), postDTO);

        if (postDTO == null) {
            throw new IllegalArgumentException("PostDTO cannot be null");
        }

        Post post;
        if (postDTO.getId() != null) {
            // Update: fetch existing post
            post = postRepository.findById(postDTO.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            messageSource.getMessage("post.not.found", "Post")));
        } else {
            // Create: always start with id = null
            post = new Post();
            post.setId(null);
        }

        // Set author
        if (post.getId() == null && postDTO.getAuthorId() != null) {
            post.setAuthor(userRepository.findById(postDTO.getAuthorId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            messageSource.getMessage("not.found", "User"))));
        }


        // Update post fields
        postMapper.updatePostFromDTO(postDTO, post);

        // Always null id for new posts (let DB assign)
        if (postDTO.getId() == null) {
            post.setId(null);
        }

        // Save post to get ID
        post = postRepository.save(post);

        // Handle media uploads
        if (files != null && !files.isEmpty()) {
            List<Media> mediaList = new ArrayList<>();
            for (MultipartFile file : files) {
                String contentType = file.getContentType();
                boolean isImage = contentType != null && contentType.startsWith("image/");
                String folder = isImage ? "post/image" : "post/video";
                String fileUrl = fileStorageService.upload(file, folder);

                Media media = Media.builder()
                        .post(post)
                        // .owner(post.getAuthor())
                        .type(isImage ? MediaType.IMAGE : MediaType.VIDEO)
                        .url(fileUrl)
                        .moderationStatus(ModerationStatus.APPROVED)
                        .build();

                mediaList.add(media);
            }
            mediaRepository.saveAll(mediaList);
            post.setMedias(mediaList);
        }

        try {
            interactionProducer.sendInteraction(
                    InteractionEvent.builder()
                            .userId(postDTO.getAuthorId())
                            .resourceType(ResourceType.POST)
                            .resourceId(post.getId())
                            .action(InteractionAction.CREATE)
                            .value(2.0)
                            .build());
        } catch (Exception e) {
            log.warn("{} - {} - Interaction send failed (non-fatal): {}", className, AppUtil.getMethodName(),
                    e.getMessage());
        }

        return post.getId();
    }

    /**
     * Fetch post by ID
     */
    @Transactional
    public PostResponseDTO getPostById(Integer id) {
        log.info("{} - {} - Request ID: {}", className, AppUtil.getMethodName(), id);
        return postRepository.findById(id)
                .map(postMapper::toResponseDTO)
                .orElseThrow(() -> new ResourceNotFoundException(
                        messageSource.getMessage("post.not.found", "Post")));
    }

    /**
     * Fetch post as PostResponseDTO
     */
    @Transactional
    public PostResponseDTO getPostResponseById(Integer id) {

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        messageSource.getMessage(Messages.NOT_FOUND.getCode(), "Post")));
        try {
            interactionProducer.sendInteraction(
                    InteractionEvent.builder()
                            .userId(post.getAuthor().getId())
                            .resourceType(ResourceType.POST) // or ResourceType.RECIPE
                            .resourceId(id)
                            .action(InteractionAction.VIEW)
                            .value(1.0)
                            .build());
        } catch (Exception e) {
            log.warn("{} - {} - Interaction send failed (non-fatal): {}", className, AppUtil.getMethodName(),
                    e.getMessage());
        }
        return postMapper.toResponseDTO(post);
    }

    /**
     * Fetch all posts for frontend (non-paginated)
     */
    @Transactional
    public List<PostResponseDTO> fetchAllPosts() {
        List<Post> posts = postRepository.findAll();
        return posts.stream()
                .map(postMapper::toResponseDTO)
                .toList();
    }

    /**
     * Paginated and filtered post list
     */
    @Transactional
    public PaginatedDtoResponse<PostResponseDTO> getAllPosts(SearchFilter filter) {
        log.info("{} - {} - Request filter: {}", className, AppUtil.getMethodName(), filter);

        if (filter == null || filter.getPagination() == null) {
            log.warn("{} - {} - Invalid filter or pagination info", className, AppUtil.getMethodName());
            return PaginatedDtoResponse.<PostResponseDTO>builder()
                    .data(Collections.emptyList())
                    .totalElements(0L)
                    .totalPages(0)
                    .build();
        }

        // Build pageable object
        PageRequest pageable = PageRequest.of(
                filter.getPagination().getPage(),
                filter.getPagination().getSize(),
                Sort.by(Sort.Direction.fromString(filter.getSortOrder()), filter.getSortBy()));

        // Fetch paginated posts with specifications
        Page<Post> postsPage = postRepository.findAll(PostSpecification.buildSpecification(filter), pageable);

        if (postsPage.isEmpty()) {
            log.info("{} - {} - No posts found", className, AppUtil.getMethodName());
            return PaginatedDtoResponse.<PostResponseDTO>builder()
                    .data(Collections.emptyList())
                    .totalElements(0L)
                    .totalPages(0)
                    .build();
        }

        // Map to DTO
        Page<PostResponseDTO> dtoPage = postsPage.map(postMapper::toResponseDTO);

        return PaginatedResHandler.getPaginatedData(dtoPage);
    }

    /**
     * Delete post by ID
     */
    @Transactional
    public Boolean deletePost(Integer id) {
        log.info("{} - {} - Delete request ID: {}", className, AppUtil.getMethodName(), id);
        try {
            interactionProducer.sendInteraction(
                    InteractionEvent.builder()
                            .userId(postRepository.findById(id).get().getAuthor().getId())
                            .resourceType(ResourceType.POST) // or ResourceType.RECIPE
                            .resourceId(id)
                            .action(InteractionAction.VIEW)
                            .value(-1.0)
                            .build());

            postRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            log.error("{} - {} - Error deleting post: {}", className, AppUtil.getMethodName(), e.getMessage());
            return false;
        }
    }

    @Transactional
    public List<PostResponseDTO> findPostByUserId(Integer id) {
        return postRepository.findAllByUserId(id).stream().map(postMapper::toResponseDTO).toList();
    }

    @Transactional
    public List<PostResponseDTO> getAllReelVideos() {
        return postRepository.findPostsByMediaType(MediaType.VIDEO).stream().map(postMapper::toResponseDTO).toList();
    }

    @Transactional
    public List<PostResponseDTO> getAllPostImage() {
        return postRepository.findPostsByMediaType(MediaType.VIDEO).stream().map(postMapper::toResponseDTO).toList();
    }
}
