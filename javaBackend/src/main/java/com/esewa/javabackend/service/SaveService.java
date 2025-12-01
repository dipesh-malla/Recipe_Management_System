package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.SaveDTO;
import com.esewa.javabackend.enums.MediaType;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.mapper.PostMapper;
import com.esewa.javabackend.mapper.RecipeMapper;
import com.esewa.javabackend.mapper.SaveMapper;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.module.Recipe;
import com.esewa.javabackend.module.Save;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.PostRepository;
import com.esewa.javabackend.repository.JpaRepository.RecipeRepository;
import com.esewa.javabackend.repository.JpaRepository.SaveRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SaveService {

    private final SaveRepository saveRepository;
    private final SaveMapper saveMapper;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final RecipeRepository recipeRepository;
    private final PostMapper postMapper;
    private final RecipeMapper recipeMapper;

    @Transactional
    public SaveDTO saveResource(SaveDTO dto) {
        if (saveRepository.existsByUserIdAndResourceTypeAndResourceId(dto.getUserId(), dto.getResourceType(), dto.getResourceId())) {
            throw new RuntimeException("Resource already saved");
        }
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        switch (dto.getResourceType()) {
            case POST, REEL -> {
                postRepository.findById(dto.getResourceId())
                        .orElseThrow(() -> new RuntimeException("Post not found"));
            }
            case RECIPE -> {
                recipeRepository.findById(dto.getResourceId())
                        .orElseThrow(() -> new RuntimeException("Recipe not found"));
            }
            default -> throw new RuntimeException("Invalid resource type");
        }

        Save save = saveMapper.toEntity(dto);
        save.setUser(user);
        Save saved = saveRepository.save(save);

        return saveMapper.toDTO(saved);
    }

    public void unsaveById(Integer saveId) {
        if (!saveRepository.existsById(saveId)) {
            throw new RuntimeException("Save entry not found");
        }
        saveRepository.deleteById(saveId);
    }
    public List<SaveDTO> getUserSavedItems(Integer userId) {
        return saveRepository.findByUserId(userId).stream()
                .map(saveMapper::toDTO)
                .toList();
    }

    @Transactional
    public List<?> agetUserSavedContent(Integer userId, ResourceType resourceType) {
        List<Save> saves = saveRepository.findByUserId(userId);

        return switch (resourceType) {


            case POST -> saves.stream()
                    .filter(s -> s.getResourceType() == ResourceType.POST)
                    .map(s -> postRepository.findById(s.getResourceId()).orElse(null))
                    .filter(Objects::nonNull)
                    .filter(p -> p.getMedias().stream().anyMatch(m -> m.getType() == MediaType.IMAGE))
                    .map(postMapper::toResponseDTO)
                    .toList();

            case REEL -> saves.stream()
                    .filter(s -> s.getResourceType() == ResourceType.REEL)
                    .map(s -> postRepository.findById(s.getResourceId()).orElse(null))
                    .filter(Objects::nonNull)
                    .filter(p -> p.getMedias().stream().anyMatch(m -> m.getType() == MediaType.VIDEO))
                    .map(postMapper::toResponseDTO)
                    .toList();

            case RECIPE -> saves.stream()
                    .filter(s -> s.getResourceType() == ResourceType.RECIPE)
                    .map(s -> recipeRepository.findById(s.getResourceId()).orElse(null))
                    .filter(Objects::nonNull)
                    .map(recipeMapper::toDTO)
                    .toList();

            default -> List.of();
        };
    }
}
