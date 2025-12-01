package com.esewa.javabackend.controller;


import com.esewa.javabackend.dto.SaveDTO;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.service.SaveService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saves")
@RequiredArgsConstructor
public class SaveController {

    private final SaveService saveService;

    @PostMapping
    public ResponseEntity<SaveDTO> saveResource(@RequestBody SaveDTO saveDTO) {
        return ResponseEntity.ok(saveService.saveResource(saveDTO));
    }

    @DeleteMapping("delete/{id}")
    public ResponseEntity<Void> unsaveResource(
            @RequestParam Integer saveId
            ) {
        saveService.unsaveById(saveId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<SaveDTO>> getUserSavedItems(@PathVariable Integer userId) {
        return ResponseEntity.ok(saveService.getUserSavedItems(userId));
    }

    @GetMapping("/bytype")
    public ResponseEntity<List<?>> getUserSavedByType(
            @RequestBody SaveDTO saveDTO
                                                            ) {
        return ResponseEntity.ok(saveService.agetUserSavedContent(saveDTO.getUserId(), saveDTO.getResourceType()));
    }
}

