package com.cubinghub.common.validation;

import com.cubinghub.domain.record.entity.EventType;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidEventTypeValidator implements ConstraintValidator<ValidEventType, String> {

    private boolean allowNull;

    @Override
    public void initialize(ValidEventType constraintAnnotation) {
        this.allowNull = constraintAnnotation.allowNull();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return allowNull;
        }

        if (value.isBlank()) {
            return false;
        }

        try {
            EventType.valueOf(value.trim());
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
