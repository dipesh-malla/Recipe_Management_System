package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.dto.UserDTO.UserProfileDTO;
import com.esewa.javabackend.dto.UserDTO.UserRequestDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
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
@Transactional
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final String className = this.getClass().getName();

    // Create / Update
    public Integer saveUser(UserRequestDTO userDTO) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, userDTO);

        User user = Optional.ofNullable(userDTO.getId())
                .map(id -> userRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")))
                .orElse(new User());

//        User mapped = userMapper.toEntity(userDTO);
//        mapped.setId(user.getId()); // preserve ID if update
        user.setNew(userDTO.isNew());
        userMapper.updateEntity(userDTO, user);

        return userRepository.save(user).getId();
    }

    @Transactional
    // Read by ID
    public UserResponseDTO getUserById(Integer id) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, id);

        return userRepository.findById(id)
                .map(userMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    // Delete
    public void deleteUser(Integer id) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        userRepository.delete(user);
    }

    // Filter / Paginated fetch
    public PaginatedDtoResponse<UserResponseDTO> getAllUsers(SearchFilter filter) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, filter);

        PageRequest pageable = PageRequest.of(
                filter.getPagination().getPage(),
                filter.getPagination().getSize(),
                Sort.by(Sort.Direction.fromString(filter.getSortOrder()), filter.getSortBy())
        );

        Page<User> users = userRepository.findAll(UserSpecification.buildSpecification(filter), pageable);
        Page<UserResponseDTO> dtoPage = users.map(userMapper::toDTO);

        return PaginatedResHandler.getPaginatedData(dtoPage);
    }

    @Transactional
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toDTO) // map entity -> DTO
                .toList();
    }

    @Transactional
    public List<UserResponseDTO> getAllUsersForAiml() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toDTO)
                .toList();
    }


    @Transactional
    public Integer updateUserProfile(UserProfileDTO profileDTO, MultipartFile file) {
        User user = userRepository.findById(profileDTO.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        userMapper.updateProfile(profileDTO, user);
        return userRepository.save(user).getId();
    }

}

