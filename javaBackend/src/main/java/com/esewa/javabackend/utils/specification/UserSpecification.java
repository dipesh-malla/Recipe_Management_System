package com.esewa.javabackend.utils.specification;

import com.esewa.javabackend.module.User;
import org.springframework.data.jpa.domain.Specification;
import com.esewa.javabackend.utils.SearchFilter;

import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.util.List;

public class UserSpecification {

    public static Specification<User> buildSpecification(SearchFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // free-text search across multiple fields
            if (filter.getSearchValue() != null && !filter.getSearchValue().isEmpty()) {
                String likePattern = "%" + filter.getSearchValue().toLowerCase() + "%";
                Predicate namePredicate = cb.like(cb.lower(root.get("username")), likePattern);
                Predicate emailPredicate = cb.like(cb.lower(root.get("email")), likePattern);
                predicates.add(cb.or(namePredicate, emailPredicate));
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

