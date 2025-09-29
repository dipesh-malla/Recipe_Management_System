package com.esewa.javabackend.service;


import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.mapper.PostMapper;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.repository.PostRepository;
import com.esewa.javabackend.utils.PaginationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostMapper postMapper;

    @CacheEvict(value = "postCache", allEntries = true)
    public UUID savePost(PostDTO postDTO) {
        Post post = Optional.ofNullable(postDTO.getId())
                .map(id -> postRepository.findById(id)
                        .orElse(new Post()))
                .orElse(new Post());
        // not woking properly
        // it only return the id not the json for the media

        post = postMapper.toEntity(postDTO);
        return postRepository.save(post).getId();
    }

    public List<PostDTO> getAllPosts(int page, int size) {
        Page<Post> postPage = postRepository.findAll(PaginationUtils.createPageRequest(page, size));
        return postPage.stream()
                .map(postMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "postCache", key = "#id")
    public PostDTO getPostById(UUID id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return postMapper.toDTO(post);
    }

    @CacheEvict(value = "postCache", key = "#id")
    public boolean deletePost(UUID id) {
        try {
            postRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
