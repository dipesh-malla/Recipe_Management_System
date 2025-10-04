package com.esewa.javabackend.repository.ElasticSearchRepository;

import com.esewa.javabackend.module.User;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserElasticRepository extends ElasticsearchRepository<User, UUID> {}
