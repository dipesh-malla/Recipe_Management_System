package com.esewa.javabackend.dto.Base;


import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GlobalApiRequest<T> {
    private T data;
}
