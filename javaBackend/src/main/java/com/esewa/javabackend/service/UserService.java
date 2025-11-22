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
    private final String className;

    public UserService(UserRepository userRepository, UserMapper userMapper, UserStatService userStatService) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.userStatService = userStatService;
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
        try {
            // Use query that filters for users with recipeCount > 0
            // Results are already sorted by recipeCount DESC in the query
            PageRequest pageRequest = PageRequest.of(page, size);
            Page<User> userPage = userRepository.findChefsWithRecipes(pageRequest);

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
            log.error("Error fetching chefs with recipes: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch chefs: " + e.getMessage());
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
