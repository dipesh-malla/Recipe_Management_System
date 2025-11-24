package com.esewa.javabackend.repository.ElasticSearchRepository;

import com.esewa.javabackend.module.Recipe;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RecipeElasticRepository extends ElasticsearchRepository<Recipe, UUID> {}
