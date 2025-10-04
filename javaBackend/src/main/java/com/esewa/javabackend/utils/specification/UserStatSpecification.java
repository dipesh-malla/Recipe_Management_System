package com.esewa.javabackend.utils.specification;

import com.esewa.javabackend.module.UserStats;
import org.springframework.data.jpa.domain.Specification;
import com.esewa.javabackend.utils.SearchFilter;

import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.util.List;

public class UserStatSpecification {

    public static Specification<UserStats> buildSpecification(SearchFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // free-text search (example: searching inside "status" field)
            if (filter.getSearchValue() != null && !filter.getSearchValue().isEmpty()) {
                String likePattern = "%" + filter.getSearchValue().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("status")), likePattern));
            }

            // dynamic filters
            if (filter.getFilters() != null) {
                filter.getFilters().forEach((key, value) -> {
                    if (value != null) {
                        predicates.add(cb.equal(root.get(key), value));
                    }
                });
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

