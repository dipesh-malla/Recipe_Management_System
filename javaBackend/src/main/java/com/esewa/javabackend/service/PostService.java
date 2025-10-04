package com.esewa.javabackend.service;


import com.esewa.javabackend.config.CustomMessageSource;
import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.mapper.PostMapper;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.repository.JpaRepository.PostRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostMapper postMapper;
    private final CustomMessageSource messageSource;
    private final String className = this.getClass().getName();

    @Transactional
    public Integer savePost(PostDTO postDTO) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, postDTO);
        if (postDTO == null) {
            throw new IllegalArgumentException("PostDTO cannot be null");
        }
        Post post = Optional.ofNullable(postDTO.getId())
                .map(id -> postRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException(messageSource.getMessage(Messages.NOT_FOUND.getCode(), "Post"))))
                .orElseGet(Post::new);

        // set author
        if (post.getId() == null && postDTO.getAuthorId() != null) {
            post.setAuthor(userRepository.findById(postDTO.getAuthorId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            messageSource.getMessage(Messages.NOT_FOUND.getCode(), "User"))));
        }

        Post mappedPost = postMapper.toEntity(postDTO);
        mappedPost.setAuthor(post.getAuthor()); // preserve already set author

        return postRepository.save(mappedPost).getId();
    }

    public PostDTO getPostById(Integer id) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, id);
        return postRepository.findById(id)
                .map(postMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException(messageSource.getMessage(Messages.NOT_FOUND.getCode(), "Post")));
    }

    public PaginatedDtoResponse<PostDTO> getAllPosts(SearchFilter filter) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, filter);

        // Build Pageable from filter
        PageRequest pageable = PageRequest.of(
                filter.getPagination().getPage(),
                filter.getPagination().getSize(),
                Sort.by(Sort.Direction.fromString(filter.getSortOrder()), filter.getSortBy())
        );

        // Fetch paginated posts
        Page<Post> postsPage = postRepository.findAll(PostSpecification.buildSpecification(filter),pageable);

        // Convert entities -> DTO
        Page<PostDTO> dtoPage = postsPage.map(postMapper::toDTO);

        // Convert to your PaginatedDtoResponse
        return PaginatedResHandler.getPaginatedData(dtoPage);
    }

    public Boolean togglePost(Integer id) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, id);
        try {
            postRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            log.error(className, AppUtil.getMethodName(), e.getMessage(), id);
            return false;
        }
    }

    public List<Post> fetchAllPosts() {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST);
        return postRepository.findAll();
    }
}
