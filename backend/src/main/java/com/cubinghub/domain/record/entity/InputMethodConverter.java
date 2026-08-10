package com.cubinghub.domain.record.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class InputMethodConverter implements AttributeConverter<InputMethod, String> {

    @Override
    public String convertToDatabaseColumn(InputMethod attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public InputMethod convertToEntityAttribute(String dbData) {
        return dbData == null ? null : InputMethod.valueOf(dbData);
    }
}
