package com.planny.server.schedule;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.jspecify.annotations.Nullable;

/** DB에는 소문자 코드로 저장한다. 비어 있는 열(null)은 그대로 둔다. */
@Converter(autoApply = true)
class PredictionSourceConverter implements AttributeConverter<PredictionSource, String> {

    @Override
    public @Nullable String convertToDatabaseColumn(@Nullable PredictionSource source) {
        return source == null ? null : source.code();
    }

    @Override
    public @Nullable PredictionSource convertToEntityAttribute(@Nullable String code) {
        return code == null ? null : PredictionSource.fromCode(code);
    }
}
