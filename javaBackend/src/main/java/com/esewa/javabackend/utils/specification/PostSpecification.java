package com.esewa.javabackend.utils.specification;

import com.esewa.javabackend.module.Post;
import org.springframework.data.jpa.domain.Specification;
import com.esewa.javabackend.utils.SearchFilter;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public class PostSpecification {

    public static Specification<Post> buildSpecification(SearchFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Free-text search on contentText
            if (filter.getSearchValue() != null && !filter.getSearchValue().isEmpty()) {
                String likePattern = "%" + filter.getSearchValue().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("contentText")), likePattern));
            }

            // Dynamic filters
            if (filter.getFilters() != null) {
                filter.getFilters().forEach((key, value) -> {
                    if (value != null) {
                        switch (key) {
                            case "authorId":
                                predicates.add(cb.equal(root.get("author").get("id"), value));
                                break;
                            case "privacy":
                                predicates.add(cb.equal(root.get("privacy"), value));
                                break;
                            case "pinned":
                                predicates.add(cb.equal(root.get("pinned"), value));
                                break;
                            default:
                                predicates.add(cb.equal(root.get(key), value));
                                break;
                        }
                    }
                });
            }


            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
