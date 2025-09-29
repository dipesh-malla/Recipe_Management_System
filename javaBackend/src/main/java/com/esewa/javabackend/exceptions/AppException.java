package com.esewa.javabackend.exceptions;

import com.esewa.javabackend.enums.Messages;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

import java.io.Serial;

@Getter
@NoArgsConstructor
public class AppException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private Messages messageCode;
    private String message;
    private Object[] args;
    private int status;
    private String source;


    public AppException(String message, HttpStatus httpStatus) {

        super(message);
        this.message= message;
        this.status = httpStatus.value();
    }

    public AppException(String source, HttpStatus httpStatus, Messages messageCode) {

        super(messageCode.getCode());
        this.message= source;
        this.status = httpStatus.value();
        this.messageCode = messageCode;

    }

    public AppException(String source, HttpStatus httpStatus, Messages messageCode, Object... args) {

        super(messageCode.getCode());
        this.message= source;
        this.status = httpStatus.value();
        this.messageCode = messageCode;
        this.args = args;

    }


}

