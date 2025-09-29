package com.esewa.javabackend.repository.ElasticSearchRepository;


import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.module.Recipe;
import com.esewa.javabackend.module.User;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PostSearchRepository extends ElasticsearchRepository<Post, UUID> {}

