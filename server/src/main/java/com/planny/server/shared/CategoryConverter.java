package com.planny.server.shared;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.jspecify.annotations.Nullable;

/** DB에는 소문자 코드로 저장한다. 비어 있는 열(null)은 그대로 둔다. */
@Converter(autoApply = true)
class CategoryConverter implements AttributeConverter<Category, String> {

    @Override
    public @Nullable String convertToDatabaseColumn(@Nullable Category category) {
        return category == null ? null : category.code();
    }

    @Override
    public @Nullable Category convertToEntityAttribute(@Nullable String code) {
        return code == null ? null : Category.fromCode(code);
    }
}
