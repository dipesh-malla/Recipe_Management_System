package com.esewa.javabackend.dto.Base;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class GlobalApiResponse<T> implements Serializable {

    private boolean success;
    private String message;
    private T data;
    private String responseCode;
}
