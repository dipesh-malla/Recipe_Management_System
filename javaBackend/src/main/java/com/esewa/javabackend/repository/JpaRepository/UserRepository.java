package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer>, JpaSpecificationExecutor<User> {
  Optional<User> findByEmail(String email);

  Optional<User> findByUsername(String username);

  // Optimized query for Chef Discovery - fetch users with profile pictures
  @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.profile")
  List<User> findAllWithProfile();

  // Paginated version for Chef Discovery - simpler query without JOIN FETCH to
  // avoid pagination issues
  @Query("SELECT u FROM User u")
  Page<User> findAllWithProfilePaginated(Pageable pageable);

  // Paginated version for chefs with recipes - filters users with recipeCount > 0
  // and orders by recipeCount descending (most recipes first)
  @Query("SELECT u FROM User u JOIN UserStats us ON us.user = u WHERE us.recipeCount > 0 ORDER BY us.recipeCount DESC")
  Page<User> findChefsWithRecipes(Pageable pageable);
}
