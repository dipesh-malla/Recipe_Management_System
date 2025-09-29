package com.esewa.javabackend.exceptions;

import com.esewa.javabackend.config.CustomMessageSource;
import com.esewa.javabackend.controller.Base.BaseController;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Objects;

@RestControllerAdvice
@Slf4j
@RequiredArgsConstructor
public class CustomExceptionHandler extends BaseController {

    private final CustomMessageSource messageSource;

    @ExceptionHandler(AppException.class)
    public ResponseEntity<?> handleMethodArgumentNotValidException(AppException ex) {
        String message = Objects.nonNull(ex.getMessageCode()) ?
                messageSource.getMessage(String.valueOf(ex.getMessageCode()), ex.getArgs()):ex.getMessage();
        log.error(message,ex);
        HttpStatus httpStatus = HttpStatus.valueOf(ex.getStatus());
        return ResponseEntity.status(httpStatus)
                .body(errorResponse(message, httpStatus));

    }

}

