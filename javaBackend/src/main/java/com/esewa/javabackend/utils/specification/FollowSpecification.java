package com.esewa.javabackend.utils.specification;

import com.esewa.javabackend.module.Follow;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.utils.SearchFilter;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.*;
import java.util.Map;

public class FollowSpecification {

    public static Specification<Follow> buildSpecification(SearchFilter filter) {
        return (root, query, cb) -> {
            Predicate predicate = cb.conjunction();
            if (filter == null) return predicate;

            Join<Follow, User> followerJoin = root.join("follower", JoinType.LEFT);
            Join<Follow, User> followeeJoin = root.join("followee", JoinType.LEFT);

            Map<String, Object> filters = filter.getFilters();
            if (filters == null) return predicate;

            // Get the target user and mode (FOLLOWERS or FOLLOWING)
            Integer userId = (Integer) filters.get("userId");
            String searchType = (String) filters.get("searchType");
            String searchValue = filter.getSearchValue();

            // 🔹 1. Filter by relationship direction
            if ("FOLLOWERS".equalsIgnoreCase(searchType)) {
                // find users who follow the given user
                predicate = cb.and(predicate, cb.equal(followeeJoin.get("id"), userId));
            } else if ("FOLLOWING".equalsIgnoreCase(searchType)) {
                // find users that this user follows
                predicate = cb.and(predicate, cb.equal(followerJoin.get("id"), userId));
            }

            // 🔹 2. Apply search filter to names/usernames
            if (searchValue != null && !searchValue.trim().isEmpty()) {
                String likeSearch = "%" + searchValue.toLowerCase() + "%";

                if ("FOLLOWERS".equalsIgnoreCase(searchType)) {
                    // search among follower users
                    Predicate searchPredicate = cb.or(
                            cb.like(cb.lower(followerJoin.get("username")), likeSearch),
                            cb.like(cb.lower(followerJoin.get("displayName")), likeSearch)
                    );
                    predicate = cb.and(predicate, searchPredicate);

                } else if ("FOLLOWING".equalsIgnoreCase(searchType)) {
                    // search among followee users
                    Predicate searchPredicate = cb.or(
                            cb.like(cb.lower(followeeJoin.get("username")), likeSearch),
                            cb.like(cb.lower(followeeJoin.get("displayName")), likeSearch)
                    );
                    predicate = cb.and(predicate, searchPredicate);
                }
            }

            return predicate;
        };
    }
}
