package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.InteractionDTO;
import com.esewa.javabackend.enums.ResourceType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Very small file-backed save store used as a temporary workaround for a single
 * user (userId == 84). Keeps a list of saved resource entries so the UI can
 * show saved recipes without requiring a DB schema migration.
 */
@Service
public class LocalSaveService {

  private final ObjectMapper mapper = new ObjectMapper();
  private final File storageDir;
  private final AtomicInteger idCounter = new AtomicInteger(100000);

  public LocalSaveService() {
    storageDir = new File(System.getProperty("user.home"), ".recipe_local_saves");
    if (!storageDir.exists())
      storageDir.mkdirs();
  }

  private File fileForUser(Integer userId) {
    return new File(storageDir, "saves_user_" + userId + ".json");
  }

  public synchronized InteractionDTO saveForUser(Integer userId, ResourceType resourceType, Integer resourceId) {
    try {
      File f = fileForUser(userId);
      List<Map<String, Object>> list = new ArrayList<>();
      if (f.exists()) {
        byte[] bytes = Files.readAllBytes(f.toPath());
        if (bytes.length > 0) {
          list = mapper.readValue(bytes, new TypeReference<List<Map<String, Object>>>() {
          });
        }
      }

      // create entry
      int localId = idCounter.getAndIncrement();
      Map<String, Object> entry = Map.of(
          "id", localId,
          "userId", userId,
          "resourceType", resourceType.name(),
          "resourceId", resourceId,
          "value", 1.0,
          "createdAt", Instant.now().toString());
      list.add(entry);
      mapper.writerWithDefaultPrettyPrinter().writeValue(f, list);

      InteractionDTO dto = new InteractionDTO();
      dto.setId(localId);
      dto.setUserId(userId);
      dto.setResourceType(resourceType);
      dto.setResourceId(resourceId);
      dto.setAction(null);
      dto.setValue(1.0);
      dto.setCreatedAT(Instant.now());
      return dto;
    } catch (Exception e) {
      throw new RuntimeException("Failed to save local save: " + e.getMessage(), e);
    }
  }

  public synchronized List<InteractionDTO> getSavesForUser(Integer userId) {
    try {
      File f = fileForUser(userId);
      if (!f.exists())
        return Collections.emptyList();
      byte[] bytes = Files.readAllBytes(f.toPath());
      if (bytes.length == 0)
        return Collections.emptyList();
      List<Map<String, Object>> list = mapper.readValue(bytes, new TypeReference<List<Map<String, Object>>>() {
      });
      List<InteractionDTO> out = new ArrayList<>();
      for (Map<String, Object> e : list) {
        InteractionDTO dto = new InteractionDTO();
        Object id = e.get("id");
        if (id instanceof Number)
          dto.setId(((Number) id).intValue());
        else if (id != null)
          dto.setId(Integer.valueOf(id.toString()));
        dto.setUserId((Integer) e.get("userId"));
        Object rt = e.get("resourceType");
        if (rt != null)
          dto.setResourceType(ResourceType.valueOf(rt.toString()));
        Object rid = e.get("resourceId");
        if (rid instanceof Number)
          dto.setResourceId(((Number) rid).intValue());
        else if (rid != null)
          dto.setResourceId(Integer.valueOf(rid.toString()));
        // parse createdAt if present
        Object ca = e.get("createdAt");
        if (ca != null) {
          try {
            dto.setCreatedAT(Instant.parse(ca.toString()));
          } catch (Exception ex) {
            // ignore parse errors and leave createdAT null
          }
        }
        out.add(dto);
      }
      return out;
    } catch (Exception e) {
      throw new RuntimeException("Failed to read local saves: " + e.getMessage(), e);
    }
  }
}
