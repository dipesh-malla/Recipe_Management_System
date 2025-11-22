package com.esewa.javabackend.service.AIML;

import com.esewa.javabackend.dto.*;
import com.esewa.javabackend.dto.UserDTO.FollowDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.dto.aiml.AIMLDataDTO;
import com.esewa.javabackend.dto.aiml.EmbeddingDTO;
import com.esewa.javabackend.dto.postDTO.PostResponseDTO;
import com.esewa.javabackend.enums.*;
import com.esewa.javabackend.module.*;
import com.esewa.javabackend.module.AIML.Embedding;
import com.esewa.javabackend.module.AIML.Interaction;
import com.esewa.javabackend.repository.JpaRepository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.*;

/**
 * Service for importing ML-generated datasets into the database
 * Handles bulk import of users, recipes, posts, interactions, follows, and
 * embeddings
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DatasetImportService {

    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;
    private final PostRepository postRepository;
    private final InteractionRepository interactionRepository;
    private final FollowRepository followRepository;
    private final EmbeddingRepository embeddingRepository;
    private final ObjectMapper objectMapper;

    /**
     * Import complete dataset from JSON file
     * 
     * @param jsonFile The JSON file containing the dataset
     * @return Import statistics
     */
    @Transactional
    public Map<String, Object> importDatasetFromFile(File jsonFile) throws IOException {
        log.info("Starting dataset import from file: {}", jsonFile.getName());

        JsonNode rootNode = objectMapper.readTree(jsonFile);
        return importDatasetFromJson(rootNode);
    }

    /**
     * Import complete dataset from MultipartFile (uploaded file)
     * 
     * @param file The uploaded file containing the dataset
     * @return Import statistics
     */
    @Transactional
    public Map<String, Object> importDatasetFromUpload(MultipartFile file) throws IOException {
        log.info("Starting dataset import from uploaded file: {}", file.getOriginalFilename());

        JsonNode rootNode = objectMapper.readTree(file.getInputStream());
        return importDatasetFromJson(rootNode);
    }

    /**
     * Import dataset from JSON string
     * 
     * @param jsonString The JSON string containing the dataset
     * @return Import statistics
     */
    @Transactional
    public Map<String, Object> importDatasetFromString(String jsonString) throws IOException {
        log.info("Starting dataset import from JSON string");

        JsonNode rootNode = objectMapper.readTree(jsonString);
        return importDatasetFromJson(rootNode);
    }

    /**
     * Core import logic from JsonNode
     */
    private Map<String, Object> importDatasetFromJson(JsonNode rootNode) {
        Map<String, Object> stats = new HashMap<>();
        long startTime = System.currentTimeMillis();

        try {
            // Import in dependency order
            int usersImported = importUsers(rootNode.get("users"));
            stats.put("users_imported", usersImported);
            log.info("Imported {} users", usersImported);

            int recipesImported = importRecipes(rootNode.get("recipes"));
            stats.put("recipes_imported", recipesImported);
            log.info("Imported {} recipes", recipesImported);

            int postsImported = importPosts(rootNode.get("posts"));
            stats.put("posts_imported", postsImported);
            log.info("Imported {} posts", postsImported);

            int followsImported = importFollows(rootNode.get("follows"));
            stats.put("follows_imported", followsImported);
            log.info("Imported {} follows", followsImported);

            int interactionsImported = importInteractions(rootNode.get("interactions"));
            stats.put("interactions_imported", interactionsImported);
            log.info("Imported {} interactions", interactionsImported);

            int embeddingsImported = importEmbeddings(rootNode.get("embeddings"));
            stats.put("embeddings_imported", embeddingsImported);
            log.info("Imported {} embeddings", embeddingsImported);

            long duration = System.currentTimeMillis() - startTime;
            stats.put("duration_ms", duration);
            stats.put("success", true);

            log.info("Dataset import completed successfully in {} ms", duration);

        } catch (Exception e) {
            log.error("Error importing dataset", e);
            stats.put("success", false);
            stats.put("error", e.getMessage());
        }

        return stats;
    }

    /**
     * Import users from JSON array
     */
    private int importUsers(JsonNode usersNode) {
        if (usersNode == null || !usersNode.isArray()) {
            return 0;
        }

        List<User> users = new ArrayList<>();
        int count = 0;

        for (JsonNode userNode : usersNode) {
            try {
                User user = new User();
                user.setId(userNode.get("id").asInt());
                user.setUsername(userNode.get("username").asText());
                user.setDisplayName(userNode.get("display_name").asText());
                user.setEmail(userNode.get("email").asText());
                user.setBio(userNode.has("bio") ? userNode.get("bio").asText() : null);
                user.setLocation(userNode.has("location") ? userNode.get("location").asText() : null);
                user.setVerified(userNode.has("verified") && userNode.get("verified").asBoolean());
                user.setChef(userNode.has("chef") && userNode.get("chef").asBoolean());

                // Parse timestamps
                if (userNode.has("created_at")) {
                    user.setCreatedAt(Instant.parse(userNode.get("created_at").asText()));
                }
                if (userNode.has("updated_at")) {
                    user.setUpdatedAt(Instant.parse(userNode.get("updated_at").asText()));
                }

                users.add(user);
                count++;

                // Batch insert every 500 users
                if (users.size() >= 500) {
                    userRepository.saveAll(users);
                    users.clear();
                    log.debug("Saved batch of users, total: {}", count);
                }

            } catch (Exception e) {
                log.warn("Failed to import user: {}", userNode, e);
            }
        }

        // Save remaining users
        if (!users.isEmpty()) {
            userRepository.saveAll(users);
        }

        return count;
    }

    /**
     * Import recipes from JSON array
     */
    private int importRecipes(JsonNode recipesNode) {
        if (recipesNode == null || !recipesNode.isArray()) {
            return 0;
        }

        List<Recipe> recipes = new ArrayList<>();
        int count = 0;

        for (JsonNode recipeNode : recipesNode) {
            try {
                Recipe recipe = new Recipe();
                recipe.setId(recipeNode.get("id").asInt());
                recipe.setTitle(recipeNode.get("title").asText());
                recipe.setDescription(recipeNode.has("description") ? recipeNode.get("description").asText() : null);

                // Find author
                Integer authorId = recipeNode.get("author_id").asInt();
                userRepository.findById(authorId).ifPresent(recipe::setAuthor);

                // Recipe metadata
                if (recipeNode.has("cuisine")) {
                    recipe.setCuisine(recipeNode.get("cuisine").asText());
                }
                if (recipeNode.has("dietary_type")) {
                    recipe.setDietaryType(recipeNode.get("dietary_type").asText());
                }
                if (recipeNode.has("servings")) {
                    recipe.setServings(recipeNode.get("servings").asInt());
                }
                if (recipeNode.has("cook_time")) {
                    recipe.setCookTime(recipeNode.get("cook_time").asInt());
                }
                if (recipeNode.has("prep_time")) {
                    recipe.setPrepTime(recipeNode.get("prep_time").asInt());
                }
                if (recipeNode.has("difficulty")) {
                    recipe.setDifficulty(recipeNode.get("difficulty").asText());
                }
                if (recipeNode.has("cooking_method")) {
                    recipe.setCookingMethod(recipeNode.get("cooking_method").asText());
                }
                if (recipeNode.has("calories_per_serving")) {
                    recipe.setCaloriesPerServing(recipeNode.get("calories_per_serving").asInt());
                }

                // Boolean flags
                recipe.setIsPublic(recipeNode.has("is_public") && recipeNode.get("is_public").asBoolean());

                // Timestamps
                if (recipeNode.has("created_date")) {
                    recipe.setCreatedDate(Instant.parse(recipeNode.get("created_date").asText()));
                }
                if (recipeNode.has("modified_date")) {
                    recipe.setModifiedDate(Instant.parse(recipeNode.get("modified_date").asText()));
                }

                recipes.add(recipe);
                count++;

                // Batch insert every 500 recipes
                if (recipes.size() >= 500) {
                    recipeRepository.saveAll(recipes);
                    recipes.clear();
                    log.debug("Saved batch of recipes, total: {}", count);
                }

            } catch (Exception e) {
                log.warn("Failed to import recipe: {}", recipeNode, e);
            }
        }

        // Save remaining recipes
        if (!recipes.isEmpty()) {
            recipeRepository.saveAll(recipes);
        }

        return count;
    }

    /**
     * Import posts from JSON array
     */
    private int importPosts(JsonNode postsNode) {
        if (postsNode == null || !postsNode.isArray()) {
            return 0;
        }

        List<Post> posts = new ArrayList<>();
        int count = 0;

        for (JsonNode postNode : postsNode) {
            try {
                Post post = new Post();
                post.setId(postNode.get("id").asInt());
                post.setContentText(postNode.get("content_text").asText());

                // Find author
                Integer authorId = postNode.get("author_id").asInt();
                userRepository.findById(authorId).ifPresent(post::setAuthor);

                // Post metadata
                if (postNode.has("privacy")) {
                    try {
                        post.setPrivacy(Privacy.valueOf(postNode.get("privacy").asText()));
                    } catch (IllegalArgumentException e) {
                        post.setPrivacy(Privacy.PUBLIC);
                    }
                }

                post.setPinned(postNode.has("pinned") && postNode.get("pinned").asBoolean());

                // Timestamps
                if (postNode.has("created_at")) {
                    post.setCreatedAt(Instant.parse(postNode.get("created_at").asText()));
                }

                posts.add(post);
                count++;

                // Batch insert every 500 posts
                if (posts.size() >= 500) {
                    postRepository.saveAll(posts);
                    posts.clear();
                    log.debug("Saved batch of posts, total: {}", count);
                }

            } catch (Exception e) {
                log.warn("Failed to import post: {}", postNode, e);
            }
        }

        // Save remaining posts
        if (!posts.isEmpty()) {
            postRepository.saveAll(posts);
        }

        return count;
    }

    /**
     * Import follows from JSON array
     */
    private int importFollows(JsonNode followsNode) {
        if (followsNode == null || !followsNode.isArray()) {
            return 0;
        }

        List<Follow> follows = new ArrayList<>();
        int count = 0;

        for (JsonNode followNode : followsNode) {
            try {
                Follow follow = new Follow();
                follow.setId(followNode.get("id").asInt());

                // Find follower and followee
                Integer followerId = followNode.get("follower_id").asInt();
                Integer followeeId = followNode.get("followee_id").asInt();

                Optional<User> follower = userRepository.findById(followerId);
                Optional<User> followee = userRepository.findById(followeeId);

                if (follower.isPresent() && followee.isPresent()) {
                    follow.setFollower(follower.get());
                    follow.setFollowee(followee.get());

                    // Status
                    if (followNode.has("status")) {
                        try {
                            follow.setStatus(FollowStatus.valueOf(followNode.get("status").asText()));
                        } catch (IllegalArgumentException e) {
                            follow.setStatus(FollowStatus.ACCEPTED);
                        }
                    }

                    // Timestamps
                    if (followNode.has("created_date")) {
                        follow.setCreatedDate(Instant.parse(followNode.get("created_date").asText()));
                    }

                    follows.add(follow);
                    count++;
                }

                // Batch insert every 500 follows
                if (follows.size() >= 500) {
                    followRepository.saveAll(follows);
                    follows.clear();
                    log.debug("Saved batch of follows, total: {}", count);
                }

            } catch (Exception e) {
                log.warn("Failed to import follow: {}", followNode, e);
            }
        }

        // Save remaining follows
        if (!follows.isEmpty()) {
            followRepository.saveAll(follows);
        }

        return count;
    }

    /**
     * Import interactions from JSON array
     */
    private int importInteractions(JsonNode interactionsNode) {
        if (interactionsNode == null || !interactionsNode.isArray()) {
            return 0;
        }

        List<Interaction> interactions = new ArrayList<>();
        int count = 0;

        for (JsonNode interactionNode : interactionsNode) {
            try {
                Interaction interaction = new Interaction();
                interaction.setId(interactionNode.get("id").asInt());

                // Find user
                Integer userId = interactionNode.get("user_id").asInt();
                userRepository.findById(userId).ifPresent(interaction::setUser);

                // Resource information
                if (interactionNode.has("resource_type")) {
                    try {
                        interaction
                                .setResourceType(ResourceType.valueOf(interactionNode.get("resource_type").asText()));
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid resource type: {}", interactionNode.get("resource_type").asText());
                    }
                }

                if (interactionNode.has("resource_id")) {
                    interaction.setResourceId(interactionNode.get("resource_id").asInt());
                }

                // Action
                if (interactionNode.has("action")) {
                    try {
                        interaction.setAction(InteractionAction.valueOf(interactionNode.get("action").asText()));
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid interaction action: {}", interactionNode.get("action").asText());
                    }
                }

                // Value (for ratings)
                if (interactionNode.has("value") && !interactionNode.get("value").isNull()) {
                    interaction.setValue(interactionNode.get("value").asDouble());
                }

                // Timestamps
                if (interactionNode.has("created_at")) {
                    interaction.setCreatedAt(Instant.parse(interactionNode.get("created_at").asText()));
                }

                interactions.add(interaction);
                count++;

                // Batch insert every 1000 interactions
                if (interactions.size() >= 1000) {
                    interactionRepository.saveAll(interactions);
                    interactions.clear();
                    log.debug("Saved batch of interactions, total: {}", count);
                }

            } catch (Exception e) {
                log.warn("Failed to import interaction: {}", interactionNode, e);
            }
        }

        // Save remaining interactions
        if (!interactions.isEmpty()) {
            interactionRepository.saveAll(interactions);
        }

        return count;
    }

    /**
     * Import embeddings from JSON array
     */
    private int importEmbeddings(JsonNode embeddingsNode) {
        if (embeddingsNode == null || !embeddingsNode.isArray()) {
            return 0;
        }

        List<Embedding> embeddings = new ArrayList<>();
        int count = 0;

        for (JsonNode embeddingNode : embeddingsNode) {
            try {
                Embedding embedding = new Embedding();
                embedding.setId(embeddingNode.get("id").asInt());

                // Object type
                if (embeddingNode.has("entity_type")) {
                    try {
                        // Map entity_type to ObjectType
                        String entityType = embeddingNode.get("entity_type").asText();
                        ObjectType objectType;
                        switch (entityType) {
                            case "USER":
                                objectType = ObjectType.USER;
                                break;
                            case "RECIPE":
                                objectType = ObjectType.RECIPE;
                                break;
                            default:
                                objectType = ObjectType.POST;
                        }
                        embedding.setObjectType(objectType);
                    } catch (Exception e) {
                        log.warn("Invalid object type: {}", embeddingNode.get("entity_type").asText());
                    }
                }

                if (embeddingNode.has("entity_id")) {
                    embedding.setObjectId(embeddingNode.get("entity_id").asInt());
                }

                // Vector embedding
                if (embeddingNode.has("embedding")) {
                    JsonNode vectorNode = embeddingNode.get("embedding");
                    float[] vector = new float[vectorNode.size()];
                    for (int i = 0; i < vectorNode.size(); i++) {
                        vector[i] = (float) vectorNode.get(i).asDouble();
                    }
                    embedding.setVector(vector);
                }

                // Model version
                if (embeddingNode.has("model_version")) {
                    embedding.setModelVersion(embeddingNode.get("model_version").asText());
                }

                // Timestamps
                if (embeddingNode.has("created_at")) {
                    embedding.setCreatedAt(Instant.parse(embeddingNode.get("created_at").asText()));
                }

                embeddings.add(embedding);
                count++;

                // Batch insert every 500 embeddings
                if (embeddings.size() >= 500) {
                    embeddingRepository.saveAll(embeddings);
                    embeddings.clear();
                    log.debug("Saved batch of embeddings, total: {}", count);
                }

            } catch (Exception e) {
                log.warn("Failed to import embedding: {}", embeddingNode, e);
            }
        }

        // Save remaining embeddings
        if (!embeddings.isEmpty()) {
            embeddingRepository.saveAll(embeddings);
        }

        return count;
    }

    /**
     * Clear all ML data from database (use with caution!)
     */
    @Transactional
    public void clearAllData() {
        log.warn("Clearing all ML data from database");

        embeddingRepository.deleteAll();
        interactionRepository.deleteAll();
        followRepository.deleteAll();
        postRepository.deleteAll();
        recipeRepository.deleteAll();
        userRepository.deleteAll();

        log.info("All ML data cleared");
    }

    /**
     * Get import statistics
     */
    public Map<String, Long> getDatasetStatistics() {
        Map<String, Long> stats = new HashMap<>();

        stats.put("users", userRepository.count());
        stats.put("recipes", recipeRepository.count());
        stats.put("posts", postRepository.count());
        stats.put("follows", followRepository.count());
        stats.put("interactions", interactionRepository.count());
        stats.put("embeddings", embeddingRepository.count());

        return stats;
    }
}
