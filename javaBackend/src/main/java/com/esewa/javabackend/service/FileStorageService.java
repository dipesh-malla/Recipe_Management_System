package com.esewa.javabackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.file.*;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @Value("${app.file.base-url}")
    private String baseUrl;

    public String upload(MultipartFile file, String folderKey) {
        if (file.isEmpty()) {
            throw new RuntimeException("Empty file cannot be uploaded.");
        }

        try {
            // Create folder if not exists
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique file name
            String originalFileName = file.getOriginalFilename();
            String extension = (originalFileName != null && originalFileName.contains("."))
                    ? originalFileName.substring(originalFileName.lastIndexOf("."))
                    : "";
            String uniqueFileName = UUID.randomUUID() + extension;

            // Save file locally
            Path targetPath = uploadPath.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = String.format("%s/uploads/%s/%s", baseUrl, folderKey, uniqueFileName);
            log.info("File uploaded successfully: {}", fileUrl);
            return fileUrl;

        } catch (IOException e) {
            log.error("Error while uploading file", e);
            throw new RuntimeException("Could not upload file: " + e.getMessage());
        }
    }

    public void deleteFile(String fileUrl) {
        try {
            // Extract filename from URL
            String filename = Paths.get(new URI(fileUrl).getPath()).getFileName().toString();
            String folder = Paths.get(new URI(fileUrl).getPath()).getParent().getFileName().toString();

            Path filePath = Paths.get(uploadDir, folder, filename);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
            }
        } catch (Exception e) {
            log.warn("Could not delete file: {}", fileUrl, e);
        }
    }

}
