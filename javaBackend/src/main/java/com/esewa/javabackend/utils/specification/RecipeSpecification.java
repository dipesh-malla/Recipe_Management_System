package com.esewa.javabackend.utils.specification;

import com.esewa.javabackend.module.Recipe;
import com.esewa.javabackend.utils.SearchFilter;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
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
                Predicate cuisinePredicate = cb.like(cb.lower(root.get("cuisine")), likePattern);

                // ✅ Join instructions safely (avoid LIKE on collection)
                Join<?, ?> instrJoin = root.join("instructions", JoinType.LEFT);
                Predicate instrPredicate = cb.like(cb.lower(instrJoin.get("stepDescription")), likePattern);

                predicates.add(cb.or(titlePredicate, descPredicate, instrPredicate, cuisinePredicate));

                // Ensure distinct results when joining collections
                query.distinct(true);
            }

            // 2️⃣ Dynamic filters (equality and joins)
            if (filter.getFilters() != null && !filter.getFilters().isEmpty()) {
                filter.getFilters().forEach((key, value) -> {
                    if (value != null) {
                        switch (key) {
                            case "ingredients" -> {
                                if (value instanceof List<?> ingredientsList) {
                                    Join<?, ?> ingredientJoin = root.join("ingredients", JoinType.LEFT);
                                    predicates.add(ingredientJoin.get("ingredientName").in(ingredientsList));
                                    query.distinct(true);
                                }
                            }
                            case "tags" -> {
                                if (value instanceof List<?> tagsList) {
                                    Join<?, ?> tagJoin = root.join("tags", JoinType.LEFT);
                                    predicates.add(tagJoin.get("name").in(tagsList));
                                    query.distinct(true);
                                }
                            }
                            case "isPublic" -> predicates.add(cb.equal(root.get("isPublic"),
                                    Boolean.parseBoolean(value.toString())));
                            case "servings", "cookTime" ->
                                    predicates.add(cb.equal(root.get(key), Integer.parseInt(value.toString())));
                            default -> predicates.add(cb.equal(root.get(key), value));
                        }
                    }
                });
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
