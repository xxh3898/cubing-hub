package com.cubinghub.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidEventTypeValidator.class)
public @interface ValidEventType {

    String message() default "유효한 WCA 종목 코드여야 합니다.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    boolean allowNull() default false;
}
