package com.esewa.javabackend.controller.Base;

import com.esewa.javabackend.config.CustomMessageSource;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.enums.Messages;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import java.util.Locale;

public class BaseController {
    @Autowired
    private CustomMessageSource messageSource;

    protected <T> GlobalApiResponse<T> successResponse(T data, Messages message, Object... args) {

        return GlobalApiResponse.<T>builder()
                .success(true)
                .responseCode(String.valueOf(HttpStatus.OK.value()))
                .message(messageSource.getMessage(message.getCode(), args, Locale.ENGLISH))
                .data(data)
                .build();
    }

    protected <T> GlobalApiResponse<T> errorResponse(String errorMessage, HttpStatus status) {
        return GlobalApiResponse.<T>builder()
                .success(false)
                .responseCode(String.valueOf(status.value()))
                .message(errorMessage)
                .build();
    }
}


