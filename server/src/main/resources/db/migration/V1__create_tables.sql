-- 한 번 main에 들어간 마이그레이션은 고치지 않고, 바꿀 내용은 새 파일(V2__...)로 추가한다.

CREATE TABLE users (
    id            uuid        PRIMARY KEY,
    -- 앱에서 소문자로 바꿔 저장해서, 대소문자만 다른 이메일로는 다시 가입할 수 없다
    email         text        NOT NULL,
    password_hash text        NOT NULL,
    user_name     text        NOT NULL,
    -- 한 달 생활비 예산 (원)
    budget        bigint      NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_budget_check CHECK (budget >= 0)
);

-- 리프레시 토큰은 원문 대신 SHA-256 해시만 저장한다.
-- 같은 로그인에서 이어진 토큰은 family_id가 같고, 이미 쓴 토큰(used_at)이 다시 오면 그 family를 모두 폐기한다.
CREATE TABLE refresh_tokens (
    id         uuid        PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    family_id  uuid        NOT NULL,
    token_hash bytea       NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used_at    timestamptz,
    revoked_at timestamptz,
    CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

CREATE TABLE events (
    id                uuid        PRIMARY KEY,
    user_id           uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title             text        NOT NULL,
    start_date        date        NOT NULL,
    -- 하루 일정이면 start_date와 같다
    end_date          date        NOT NULL,
    event_type        text        NOT NULL,
    location          text,
    -- 함께하는 사람 이름 (본인 제외)
    people            text[]      NOT NULL DEFAULT '{}',
    -- AI(또는 목업)가 만든 예측 (types.ts의 EventPrediction)
    prediction        jsonb,
    prediction_source text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    -- transactions의 복합 외래 키가 가리킬 수 있게 (user_id, id)를 유일하게 둔다
    CONSTRAINT events_user_id_id_key UNIQUE (user_id, id),
    CONSTRAINT events_date_range_check CHECK (end_date >= start_date),
    CONSTRAINT events_event_type_check
        CHECK (event_type IN ('friends', 'date', 'travel', 'performance', 'work', 'family', 'other')),
    CONSTRAINT events_prediction_source_check CHECK (prediction_source IN ('ai', 'mock'))
);

CREATE INDEX events_user_id_start_date_idx ON events (user_id, start_date);

CREATE TABLE transactions (
    id         uuid        PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    spent_on   date        NOT NULL,
    -- 원 단위, 항상 양수
    amount     bigint      NOT NULL,
    category   text        NOT NULL,
    merchant   text        NOT NULL,
    event_id   uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT transactions_amount_check CHECK (amount > 0),
    CONSTRAINT transactions_category_check
        CHECK (category IN ('meal', 'cafe', 'delivery', 'grocery', 'transport', 'lodging',
                            'shopping', 'culture', 'gift', 'subscription', 'etc')),
    -- 같은 사용자의 일정에만 연결할 수 있고, 일정을 지우면 거래는 남기고 연결(event_id)만 끊는다
    CONSTRAINT transactions_event_fkey FOREIGN KEY (user_id, event_id)
        REFERENCES events (user_id, id) ON DELETE SET NULL (event_id)
);

CREATE INDEX transactions_user_id_spent_on_idx ON transactions (user_id, spent_on);
CREATE INDEX transactions_user_id_event_id_idx ON transactions (user_id, event_id) WHERE event_id IS NOT NULL;
