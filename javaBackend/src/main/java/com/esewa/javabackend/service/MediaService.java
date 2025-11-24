package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.UserDTO.UserProfileDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.enums.MediaType;
import com.esewa.javabackend.enums.ModerationStatus;
import com.esewa.javabackend.mapper.UserMapper;
import com.esewa.javabackend.module.Media;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.MediaRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

@Service
@AllArgsConstructor
public class MediaService {

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final UserMapper userMapper;
    private final MediaRepository  mediaRepository;


    @Transactional
    public UserResponseDTO updateUserProfile(UserProfileDTO profileDTO, MultipartFile profilePic) {
        User user = userRepository.findById(profileDTO.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        userMapper.updateProfile(profileDTO, user);

        if (profilePic != null && !profilePic.isEmpty()) {

            Media existingProfile = user.getProfile();
            if (existingProfile != null && existingProfile.getUrl() != null) {
                fileStorageService.deleteFile(existingProfile.getUrl());
                mediaRepository.delete(existingProfile); // remove from DB
            }

            String fileUrl = fileStorageService.upload(profilePic, "profile");

            Media media = Optional.ofNullable(user.getProfile()).orElse(new Media());
            media.setOwner(user);
            media.setUrl(fileUrl);
            media.setType(MediaType.IMAGE);
            media.setModerationStatus(ModerationStatus.APPROVED);

            mediaRepository.save(media);
            user.setProfile(media);
        }

        User saved = userRepository.save(user);
        return userMapper.toDTO(saved);
    }

}
