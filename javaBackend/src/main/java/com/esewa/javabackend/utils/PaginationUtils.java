package com.esewa.javabackend.utils;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

public class PaginationUtils {
    public static Pageable createPageRequest(int page, int size) {
        return PageRequest.of(page, size);
    }
}
