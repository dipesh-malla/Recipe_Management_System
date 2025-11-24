package com.esewa.javabackend.utils;


import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public class PaginatedResHandler {
    public static <T> PaginatedDtoResponse<T> getPaginatedData(Page<T> page) {
        return PaginatedDtoResponse.<T>builder()
                .data(page.getContent())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .currentPage(page.getNumber())
                .pageSize(page.getSize())
                .build();
    }
}
