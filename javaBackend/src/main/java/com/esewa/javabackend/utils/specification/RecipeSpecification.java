package com.esewa.javabackend.utils.specification;

import com.esewa.javabackend.module.Recipe;
import com.esewa.javabackend.utils.SearchFilter;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Join;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class RecipeSpecification {

    @SuppressWarnings("unchecked")
    public static Specification<Recipe> buildSpecification(SearchFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1️⃣ Free-text search across title, description, instructions, cuisine
            if (filter.getSearchValue() != null && !filter.getSearchValue().isEmpty()) {
                String likePattern = "%" + filter.getSearchValue().toLowerCase() + "%";
                Predicate titlePredicate = cb.like(cb.lower(root.get("title")), likePattern);
                Predicate descPredicate = cb.like(cb.lower(root.get("description")), likePattern);
                Predicate instrPredicate = cb.like(cb.lower(root.get("instructions")), likePattern);
                Predicate cuisinePredicate = cb.like(cb.lower(root.get("cuisine")), likePattern);
                predicates.add(cb.or(titlePredicate, descPredicate, instrPredicate, cuisinePredicate));
            }

            // 2️⃣ Dynamic filters (equality)
            if (filter.getFilters() != null) {
                filter.getFilters().forEach((key, value) -> {
                    if (value != null) {
                        switch (key) {
                            case "ingredients":
                                if (value instanceof List) {
                                    Join<Recipe, String> ingredientJoin = root.join("ingredients");
                                    predicates.add(ingredientJoin.in((List<String>) value));
                                }
                                break;
                            case "tags":
                                if (value instanceof List) {
                                    Join<Recipe, String> tagJoin = root.join("tags");
                                    predicates.add(tagJoin.in((List<String>) value));
                                }
                                break;
                            case "isPublic":
                                predicates.add(cb.equal(root.get("isPublic"), Boolean.parseBoolean(value.toString())));
                                break;
                            case "servings":
                            case "cookTime":
                                predicates.add(cb.equal(root.get(key), Integer.parseInt(value.toString())));
                                break;
                            default:
                                predicates.add(cb.equal(root.get(key), value));
                        }
                    }
                });
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
