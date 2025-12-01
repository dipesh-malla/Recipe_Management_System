package com.esewa.javabackend.service.AIML;

import com.esewa.javabackend.dto.aiml.AIMLDataDTO;
import com.esewa.javabackend.module.AIML.Interaction;
import com.esewa.javabackend.module.Follow;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.module.Recipe;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AIMLService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final RecipeRepository recipeRepository;
    private final InteractionRepository interactionRepository;
    private final FollowRepository followRepository;

    public void markDatasetAsTrained(AIMLDataDTO dataset) {
        dataset.getUsers().forEach(user -> {
            User u = userRepository.findById(user.getId()).orElseThrow();
            u.setNew(false);
            userRepository.save(u);
        });

        dataset.getPosts().forEach(post -> {
            Post p = postRepository.findById(post.getId()).orElseThrow();
            p.setNew(false);
            postRepository.save(p);
        });

        dataset.getRecipes().forEach(recipe -> {
            Recipe r = recipeRepository.findById(recipe.getId()).orElseThrow();
            r.setNew(false);
            recipeRepository.save(r);
        });

        dataset.getInteractions().forEach(interaction -> {
            Interaction i = interactionRepository.findById(interaction.getId()).orElseThrow();
            i.setNew(false);
            interactionRepository.save(i);
        });

        dataset.getFollows().forEach(follow -> {

            Follow f = followRepository.findById(follow.getId()).orElseThrow();
            f.setNew(false);
            followRepository.save(f);
        });
    }

}
