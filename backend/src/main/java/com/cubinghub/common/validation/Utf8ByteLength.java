package com.cubinghub.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = Utf8ByteLengthValidator.class)
public @interface Utf8ByteLength {

    String message() default "UTF-8 바이트 길이가 너무 깁니다.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    int max();
}
