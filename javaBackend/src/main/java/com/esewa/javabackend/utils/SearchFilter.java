package com.esewa.javabackend.utils;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Map;


@Getter
@Setter
public class SearchFilter {

    @NotNull
    private Pagination pagination;

    private String searchValue;
    private Integer authorId;
    private String privacy; // PUBLIC, FRIENDS, PRIVATE
    private Boolean pinned;
    private LocalDateTime createdAfter;
    private LocalDateTime createdBefore;
    private String sortBy = "createdDate";      // default sort field
    private String sortOrder = "DESC";
    private Map<String, Object> filters;

    // You can add more filters here later, e.g., sortBy, type, dateRange, etc.

    @Getter
    @Setter
    public static class Pagination {
        @Min(0)
        private int page = 0; // default page index

        @Min(1)
        private int size = 10; // default page size
    }
}
