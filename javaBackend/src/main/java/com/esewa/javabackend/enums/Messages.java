package com.esewa.javabackend.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum Messages {
    SUCCESS("request.success"),
    INVALID("request.invalid"),
    INTERNAL_SERVER_ERROR("internal.server.error"),
    RESOURCES_ALREADY_EXISTS("resource.already.exists"),
    NOT_FOUND("not.found"),
    NOT_ALLOWED("not.allowed"),
    REQUIRED("required"),
    SAVED_SUCCESS("saved.success"),
    UPDATE_SUCCESS("update.success");

    final String code;
}
