package com.esewa.javabackend.repository.ElasticSearchRepository;


import com.esewa.javabackend.module.Post;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PostElasticRepository extends ElasticsearchRepository<Post, UUID> {}

