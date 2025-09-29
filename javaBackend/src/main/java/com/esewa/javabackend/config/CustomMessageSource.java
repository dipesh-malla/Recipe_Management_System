package com.esewa.javabackend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CustomMessageSource {

    private final MessageSource messageSource;

    public String getMessage(String code, Object... args) {
        return messageSource.getMessage(code, args, getLocale());
    }

    public Locale getLocale() {
        Locale locale = LocaleContextHolder.getLocale();
        if(locale.getDisplayLanguage().equalsIgnoreCase("English")){
            locale = new Locale("en", "English");
        }
        return locale;
    }
}
