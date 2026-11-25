package com.planny.server.schedule;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.jspecify.annotations.Nullable;

/** DB에는 소문자 코드로 저장한다. 비어 있는 열(null)은 그대로 둔다. */
@Converter(autoApply = true)
class EventTypeConverter implements AttributeConverter<EventType, String> {

    @Override
    public @Nullable String convertToDatabaseColumn(@Nullable EventType type) {
        return type == null ? null : type.code();
    }

    @Override
    public @Nullable EventType convertToEntityAttribute(@Nullable String code) {
        return code == null ? null : EventType.fromCode(code);
    }
}
