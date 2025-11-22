package com.esewa.javabackend.service;

import com.esewa.javabackend.config.kafka.InteractionProducer;
import com.esewa.javabackend.dto.*;
import com.esewa.javabackend.dto.event.InteractionEvent;
import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.MediaType;
import com.esewa.javabackend.enums.ModerationStatus;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.mapper.RecipeMapper;
import com.esewa.javabackend.module.*;
import com.esewa.javabackend.repository.JpaRepository.MediaRepository;
import com.esewa.javabackend.repository.JpaRepository.RecipeRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import com.esewa.javabackend.repository.JpaRepository.ReactionRepository;
import com.esewa.javabackend.repository.JpaRepository.RecipeCommentRepository;
import com.esewa.javabackend.service.AIML.InteractionService;
import com.esewa.javabackend.utils.AppUtil;
import com.esewa.javabackend.utils.PaginatedResHandler;
import com.esewa.javabackend.utils.SearchFilter;
import com.esewa.javabackend.utils.specification.RecipeSpecification;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.transaction.Transactional;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final MediaRepository mediaRepository;
    private final RecipeMapper recipeMapper;
    private final FileStorageService fileStorageService;
    private final InteractionService interactionService;
    private final InteractionProducer interactionProducer;
    private final ReactionRepository reactionRepository;
    private final RecipeCommentRepository recipeCommentRepository;

    private final String className = this.getClass().getName();

    // --- Create / Update Recipe with Media ---
    @Transactional
    public Integer saveRecipeWithMedia(RecipeDTO recipeDTO, List<MultipartFile> files) {
        if (recipeDTO == null)
            throw new IllegalArgumentException("RecipeDTO cannot be null");

        Recipe recipe = Optional.ofNullable(recipeDTO.getId())
                .map(id -> recipeRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("Recipe not found")))
                .orElseGet(Recipe::new);

        if (recipeDTO.getAuthorId() == null) {
            throw new RuntimeException("Author id not found");

        }
        User author = userRepository.findById(recipeDTO.getAuthorId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        recipe.setAuthor(author);

        recipe.setTitle(recipeDTO.getTitle());
        recipe.setDescription(recipeDTO.getDescription());
        recipe.setCookTime(recipeDTO.getCookTime());
        recipe.setDietaryType(recipeDTO.getDietaryType());
        recipe.setPublic(recipeDTO.isPublic());
        recipe.setServings(recipeDTO.getServings());

        Recipe savedRecipe = recipeRepository.save(recipe);
        if (recipeDTO.getInstructions() != null) {
            List<Instruction> instructions = new ArrayList<>();
            for (InstructionDTO dto : recipeDTO.getInstructions()) {
                Instruction instruction = new Instruction();
                instruction.setStepNumber(dto.getStepNumber());
                instruction.setStepDescription(dto.getStepDescription());
                instruction.setRecipe(recipe); // link to parent
                instructions.add(instruction);
            }
            recipe.getInstructions().addAll(instructions);
        }

        if (recipeDTO.getIngredients() != null) {
            List<Ingredients> ingredients = new ArrayList<>();
            for (IngredientDTO dto : recipeDTO.getIngredients()) {
                Ingredients ing = new Ingredients();
                ing.setIngredientName(dto.getIngredientName());
                ing.setRecipe(recipe);
                ingredients.add(ing);
            }
            recipe.getIngredients().addAll(ingredients);
        }

        if (recipeDTO.getTags() != null) {
            List<Tag> tags = new ArrayList<>();
            for (TagDTO dto : recipeDTO.getTags()) {
                Tag tag = new Tag();
                tag.setName(dto.getName());
                tag.setRecipe(recipe);
                tags.add(tag);
            }
            recipe.getTags().addAll(tags);
        }

        if (files != null && !files.isEmpty()) {
            List<Media> mediaList = new ArrayList<>();
            for (MultipartFile file : files) {
                String folder = Objects.requireNonNull(file.getContentType()).startsWith("image/") ? "recipe/image"
                        : "recipe/video";
                String fileUrl = fileStorageService.upload(file, folder);

                Media media = Media.builder()
                        .recipe(recipe)
                        .type(file.getContentType().startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO)
                        .url(fileUrl)
                        .moderationStatus(ModerationStatus.APPROVED)
                        .build();
                mediaList.add(media);
            }
            recipe.getMedia().addAll(mediaList);
        }
        // interactionService.logInteraction(
        // author,
        // ResourceType.RECIPE,
        // recipe.getId(),
        // InteractionAction.CREATE,
        // 2.0
        // );
        interactionProducer.sendInteraction(
                InteractionEvent.builder()
                        .userId(author.getId())
                        .resourceType(ResourceType.RECIPE)
                        .resourceId(recipe.getId())
                        .action(InteractionAction.CREATE)
                        .value(4.0)
                        .build());

        return recipe.getId();
    }

    // --- Get Recipe by ID ---
    @Transactional
    public RecipeDTO getRecipeById(Integer id) {

        // interactionService.logInteraction(
        // userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not
        // found")),
        // ResourceType.RECIPE,
        // id,
        // InteractionAction.VIEW,
        // 1.0
        // );

        interactionProducer.sendInteraction(
                InteractionEvent.builder()
                        .userId(recipeRepository.findById(id).get().getAuthor().getId())
                        .resourceType(ResourceType.RECIPE)
                        .resourceId(id)
                        .action(InteractionAction.VIEW)
                        .value(2.0)
                        .build());
        return recipeRepository.findById(id)
                .map(recipeMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found"));
    }

    // --- Delete Recipe ---
    @Transactional
    public void deleteRecipe(Integer id) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found"));
        recipeRepository.delete(recipe);
    }

    // --- Paginated fetch with filters ---
    @Transactional
    public Page<RecipeDTO> getAllRecipes(SearchFilter filter) {
        Pageable pageable = PageRequest.of(
                filter.getPagination() != null ? filter.getPagination().getPage() : 0,
                filter.getPagination() != null ? filter.getPagination().getSize() : 10,
                Sort.by(Sort.Direction.fromString(filter.getSortOrder()), filter.getSortBy()));

        Page<Recipe> recipes = recipeRepository.findAll(
                RecipeSpecification.buildSpecification(filter),
                pageable);

        return recipes.map(recipeMapper::toDTO);
    }

    // --- Fetch all recipes ---
    @Transactional
    public List<RecipeDTO> findAllRecipes() {
        return recipeRepository.findAll().stream()
                .map(recipeMapper::toDTO)
                .toList();
    }

    // --- Fetch all recipes with pagination (optimized) ---
    @Transactional
    public Page<RecipeDTO> findAllRecipesPaginated(int page, int size, String sortBy, String sortOrder) {
        // Limit size to prevent excessive load
        size = Math.min(size, 100);

        Sort sort = Sort.by(
                "DESC".equalsIgnoreCase(sortOrder) ? Sort.Direction.DESC : Sort.Direction.ASC,
                sortBy);

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Recipe> recipes = recipeRepository.findAll(pageable);

        // Map each recipe to DTO and ensure dynamic fields are set
        return recipes.map(recipe -> {
            RecipeDTO dto = recipeMapper.toDTO(recipe);
            // Set authorName from User entity (author_id)
            if (recipe.getAuthor() != null) {
                String displayName = recipe.getAuthor().getDisplayName();
                dto.setAuthorName(
                        displayName != null && !displayName.isEmpty() ? displayName : recipe.getAuthor().getUsername());
            } else {
                dto.setAuthorName("Unknown Chef");
            }
            // Set reactionsCount and commentsCount from direct columns
            dto.setReactionsCount(recipe.getLikeCount() != null ? recipe.getLikeCount() : 0);
            dto.setCommentsCount(recipe.getCommentCount() != null ? recipe.getCommentCount() : 0);
            return dto;
        });
    }

    // --- Fetch recipes by user ---
    @Transactional
    public List<RecipeDTO> getRecipesByUser(Integer userId) {
        return recipeRepository.findByAuthorId(userId).stream()
                .map(recipeMapper::toDTO)
                .toList();
    }

    // --- Fetch recipes by user with pagination ---
    @Transactional
    public Page<RecipeDTO> getRecipesByUser(Integer userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdDate").descending());
        Page<Recipe> recipePage = recipeRepository.findByAuthorId(userId, pageable);
        return recipePage.map(recipeMapper::toDTO);
    }

    // public Integer saveRecipe(RecipeDTO recipeDTO) {

    // \ private List<InstructionDTO> instructions;
    // private List<IngredientDTO> ingredients;
    // private List<Tag> tags;
    // private LocalDateTime createdDate;
    // private LocalDateTime modifiedDate;
    // private List<MediaDTO> media;

    // }

    /**
     * Return filtered recipes. Originally this used a Redis-backed cache; for now
     * this implementation fetches a page of recipes and applies simple in-memory
     * filters.
     */
    @Transactional
    public org.springframework.data.domain.Page<RecipeDTO> getFilteredRecipesFromCache(String cuisine,
            String difficulty, Integer maxCookTime,
            String searchTerm, int page, int size) {
        // Build a DB-level specification for efficient filtering and pagination
        Specification<Recipe> spec = (root, query, cb) -> {
            List<Predicate> predicates = new java.util.ArrayList<>();

            // Free-text search across title, description and cuisine
            if (searchTerm != null && !searchTerm.isBlank()) {
                String likePattern = "%" + searchTerm.toLowerCase() + "%";
                Predicate titlePredicate = cb.like(cb.lower(root.get("title")), likePattern);
                Predicate descPredicate = cb.like(cb.lower(root.get("description")), likePattern);
                Predicate cuisinePredicate = cb.like(cb.lower(root.get("cuisine")), likePattern);

                // join instructions for searching stepDescription
                Join<?, ?> instrJoin = root.join("instructions", JoinType.LEFT);
                Predicate instrPredicate = cb.like(cb.lower(instrJoin.get("stepDescription")), likePattern);

                predicates.add(cb.or(titlePredicate, descPredicate, cuisinePredicate, instrPredicate));
                query.distinct(true);
            }

            // Exact / range filters
            if (cuisine != null && !"all".equalsIgnoreCase(cuisine)) {
                predicates.add(cb.equal(cb.lower(root.get("cuisine")), cuisine.toLowerCase()));
            }

            // difficulty is not a stored recipe attribute in the current schema; ignore if
            // provided

            if (maxCookTime != null) {
                predicates.add(cb.le(root.get("cookTime"), maxCookTime));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdDate"));
        Page<Recipe> recipePage = recipeRepository.findAll(spec, pageable);

        // Map to DTOs and set dynamic fields
        List<RecipeDTO> dtos = recipePage.stream().map(recipe -> {
            RecipeDTO dto = recipeMapper.toDTO(recipe);
            if (recipe.getAuthor() != null) {
                String displayName = recipe.getAuthor().getDisplayName();
                dto.setAuthorName(
                        displayName != null && !displayName.isEmpty() ? displayName : recipe.getAuthor().getUsername());
            } else {
                dto.setAuthorName("Unknown Chef");
            }
            dto.setReactionsCount(recipe.getLikeCount() != null ? recipe.getLikeCount() : 0);
            dto.setCommentsCount(recipe.getCommentCount() != null ? recipe.getCommentCount() : 0);
            return dto;
        }).toList();
        return new org.springframework.data.domain.PageImpl<>(dtos, recipePage.getPageable(),
                recipePage.getTotalElements());
    }

    /**
     * Cache all recipes to Redis. If a Redis cache is not configured this is a
     * no-op
     * and will log the intention. This preserves the controller API while the
     * caching implementation can be added later.
     */
    public void cacheAllRecipesToRedis() {
        log.info("cacheAllRecipesToRedis called - no Redis cache configured in this build. Skipping caching.");
        // Future work: serialize all recipes and push to Redis using RedisTemplate or
        // similar.
    }
}
