package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.dto.UserDTO.UserProfileDTO;
import com.esewa.javabackend.dto.UserDTO.UserRequestDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.dto.UserDTO.UserStatDTO;
import com.esewa.javabackend.mapper.UserMapper;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import com.esewa.javabackend.utils.AppConstants;
import com.esewa.javabackend.utils.AppUtil;
import com.esewa.javabackend.utils.PaginatedResHandler;
import com.esewa.javabackend.utils.SearchFilter;
import com.esewa.javabackend.utils.specification.UserSpecification;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final UserStatService userStatService;
    private final com.esewa.javabackend.repository.JpaRepository.UserStatsRepository userStatRepository;
    private final String className;

    public UserService(UserRepository userRepository, UserMapper userMapper, UserStatService userStatService,
            com.esewa.javabackend.repository.JpaRepository.UserStatsRepository userStatRepository) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.userStatService = userStatService;
        this.userStatRepository = userStatRepository;
        this.className = this.getClass().getName();
    }

    // Create / Update
    @Transactional
    public Integer saveUser(UserRequestDTO userDTO) {
        log.info(className, AppUtil.getMethodName(), AppConstants.REQUEST, userDTO);

        User user = Optional.ofNullable(userDTO.getId())
                .map(id -> userRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")))
                .orElse(new User());

        // User mapped = userMapper.toEntity(userDTO);
        // mapped.setId(user.getId()); // preserve ID if update
        userMapper.updateEntity(userDTO, user);

        return userRepository.save(user).getId();
    }

    @Transactional
    // Read by ID
    public UserResponseDTO getUserById(Integer id) {
        log.info(className, AppUtil.getMethodName(), AppConstants.REQUEST, id);

        return userRepository.findById(id)
                .map(userMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    // Delete
    @Transactional
    public void deleteUser(Integer id) {
        log.info(className, AppUtil.getMethodName(), AppConstants.REQUEST, id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        userRepository.delete(user);
    }

    // Filter / Paginated fetch
    public PaginatedDtoResponse<UserResponseDTO> getAllUsers(SearchFilter filter) {
        log.info(className, AppUtil.getMethodName(), AppConstants.REQUEST, filter);

        PageRequest pageable = PageRequest.of(
                filter.getPagination().getPage(),
                filter.getPagination().getSize(),
                Sort.by(Sort.Direction.fromString(filter.getSortOrder()), filter.getSortBy()));

        Page<User> users = userRepository.findAll(UserSpecification.buildSpecification(filter), pageable);
        Page<UserResponseDTO> dtoPage = users.map(userMapper::toDTO);

        return PaginatedResHandler.getPaginatedData(dtoPage);
    }

    @Transactional
    public List<UserResponseDTO> getAllUsers() {
        // Use optimized query that only fetches users with their profile pictures
        // This avoids loading all relationships (posts, recipes, followers, etc.)
        return userRepository.findAllWithProfile()
                .stream()
                .map(user -> {
                    UserResponseDTO dto = userMapper.toDTO(user);
                    // Add stats for each user
                    try {
                        dto.setStats(userStatService.getUserStatByUserId(user.getId()));
                    } catch (Exception e) {
                        log.warn("Failed to fetch stats for user {}: {}", user.getId(), e.getMessage());
                    }
                    // Add profileUrl from profile media
                    if (user.getProfile() != null && user.getProfile().getUrl() != null) {
                        dto.setProfileUrl(user.getProfile().getUrl());
                    }
                    return dto;
                })
                .toList();
    }

    public PaginatedDtoResponse<UserResponseDTO> getAllUsers(int page, int size) {
        try {
            // Use simple query with pagination (profile will be lazily loaded)
            PageRequest pageRequest = PageRequest.of(page, size, Sort.by("id").descending());
            Page<User> userPage = userRepository.findAllWithProfilePaginated(pageRequest);

            // Map to DTOs with stats
            Page<UserResponseDTO> dtoPage = userPage.map(user -> {
                UserResponseDTO dto = userMapper.toDTO(user);

                // Add stats for each user (handle errors gracefully)
                try {
                    UserStatDTO stats = userStatService.getUserStatByUserId(user.getId());
                    dto.setStats(stats);
                } catch (Exception e) {
                    log.warn("Failed to fetch stats for user {}: {}", user.getId(), e.getMessage());
                    // Set null stats if fetch fails
                    dto.setStats(null);
                }

                // Add profileUrl from profile media (handle lazy loading)
                try {
                    if (user.getProfile() != null && user.getProfile().getUrl() != null) {
                        dto.setProfileUrl(user.getProfile().getUrl());
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch profile for user {}: {}", user.getId(), e.getMessage());
                }

                return dto;
            });

            return PaginatedResHandler.getPaginatedData(dtoPage);
        } catch (Exception e) {
            log.error("Error fetching paginated users: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch users: " + e.getMessage());
        }
    }

    public PaginatedDtoResponse<UserResponseDTO> getChefsWithRecipes(int page, int size) {
        // Backwards-compatible call that delegates to the newer overload without
        // search/sort
        return getChefsWithRecipes(page, size, null, "recipes", "DESC");
    }

    /**
     * Fetch paginated chefs (users with recipes) with optional server-side search
     * and sorting.
     * - searchValue: free-text search against username, email or displayName
     * - sortBy: "recipes" | "followers" | "newest"
     * - sortOrder: "ASC" | "DESC"
     */
    public PaginatedDtoResponse<UserResponseDTO> getChefsWithRecipes(int page, int size, String searchValue,
            String sortBy, String sortOrder) {
        try {
            // Map logical sort keys to UserStats fields (we will query UserStats and map
            // back to User DTOs)
            String statsSortField = "recipeCount";
            if ("followers".equalsIgnoreCase(sortBy)) {
                statsSortField = "followersCount";
            } else if ("newest".equalsIgnoreCase(sortBy)) {
                // When sorting by newest we prefer user's createdDate; treat specially below
                statsSortField = null;
            }

            PageRequest pageRequest;
            if (statsSortField != null) {
                pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(sortOrder), statsSortField));
            } else {
                // sort by user's createdDate via nested property on UserStats.user.createdDate
                pageRequest = PageRequest.of(page, size,
                        Sort.by(Sort.Direction.fromString(sortOrder), "user.createdDate"));
            }

            // Build specification: require recipeCount > 0 and optional search against user
            // fields
            org.springframework.data.jpa.domain.Specification<com.esewa.javabackend.module.UserStats> spec = (root,
                    query, cb) -> {
                java.util.List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
                predicates.add(cb.greaterThan(root.get("recipeCount"), 0));

                if (searchValue != null && !searchValue.trim().isEmpty()) {
                    String likePattern = "%" + searchValue.toLowerCase() + "%";
                    jakarta.persistence.criteria.Join<com.esewa.javabackend.module.UserStats, com.esewa.javabackend.module.User> userJoin = root
                            .join("user");
                    jakarta.persistence.criteria.Predicate namePredicate = cb.like(cb.lower(userJoin.get("username")),
                            likePattern);
                    jakarta.persistence.criteria.Predicate emailPredicate = cb.like(cb.lower(userJoin.get("email")),
                            likePattern);
                    jakarta.persistence.criteria.Predicate displayPredicate = cb
                            .like(cb.lower(userJoin.get("displayName")), likePattern);
                    predicates.add(cb.or(namePredicate, emailPredicate, displayPredicate));
                }

                return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
            };

            Page<com.esewa.javabackend.module.UserStats> statsPage = userStatRepository.findAll(spec, pageRequest);

            // Map UserStats -> UserResponseDTO (attach stats from the entity without extra
            // DB calls)
            Page<UserResponseDTO> dtoPage = statsPage.map(us -> {
                com.esewa.javabackend.module.User user = us.getUser();
                UserResponseDTO dto = userMapper.toDTO(user);

                // Build UserStatDTO from entity values
                UserStatDTO statDto = UserStatDTO.builder()
                        .id(us.getId())
                        .userId(user.getId())
                        .active(true)
                        .recipeCount(us.getRecipeCount())
                        .followersCount(us.getFollowersCount())
                        .followingCount(us.getFollowingCount())
                        .lastLogin(null)
                        .build();

                dto.setStats(statDto);

                // Add profileUrl if available
                try {
                    if (user.getProfile() != null && user.getProfile().getUrl() != null) {
                        dto.setProfileUrl(user.getProfile().getUrl());
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch profile for user {}: {}", user.getId(), e.getMessage());
                }

                return dto;
            });

            return PaginatedResHandler.getPaginatedData(dtoPage);
        } catch (Exception e) {
            log.error("Error fetching chefs with recipes: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch chefs: " + e.getMessage());
        }
    }

    // Return top N trending chefs by combined followers + recipes
    public java.util.List<UserResponseDTO> getTrendingChefs(int size) {
        try {
            org.springframework.data.domain.PageRequest pr = org.springframework.data.domain.PageRequest.of(0,
                    Math.max(1, size));
            org.springframework.data.domain.Page<com.esewa.javabackend.module.UserStats> page = userStatRepository
                    .findTopByCombined(pr);
            java.util.List<UserResponseDTO> list = page.getContent().stream().map(us -> {
                com.esewa.javabackend.module.User user = us.getUser();
                UserResponseDTO dto = userMapper.toDTO(user);
                // Build stat DTO
                UserStatDTO statDto = UserStatDTO.builder()
                        .id(us.getId())
                        .userId(user.getId())
                        .active(true)
                        .recipeCount(us.getRecipeCount())
                        .followersCount(us.getFollowersCount())
                        .followingCount(us.getFollowingCount())
                        .lastLogin(null)
                        .build();
                dto.setStats(statDto);
                try {
                    if (user.getProfile() != null && user.getProfile().getUrl() != null)
                        dto.setProfileUrl(user.getProfile().getUrl());
                } catch (Exception e) {
                    log.warn("Failed to fetch profile for trending user {}: {}", user.getId(), e.getMessage());
                }
                return dto;
            }).toList();

            return list;
        } catch (Exception e) {
            log.error("Error fetching trending chefs: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch trending chefs: " + e.getMessage());
        }
    }

    @Transactional
    public Integer updateUserProfile(UserProfileDTO profileDTO, MultipartFile file) {
        User user = userRepository.findById(profileDTO.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        userMapper.updateProfile(profileDTO, user);
        return userRepository.save(user).getId();
    }

}
