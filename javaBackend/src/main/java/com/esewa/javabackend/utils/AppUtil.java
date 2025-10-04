package com.esewa.javabackend.utils;

public class AppUtil {
    public static String getMethodName() {
        return Thread.currentThread().getStackTrace()[2].getMethodName();
    }
}