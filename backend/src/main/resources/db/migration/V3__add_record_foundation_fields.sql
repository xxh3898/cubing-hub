ALTER TABLE records
    ADD COLUMN input_method VARCHAR(32) NULL,
    ADD COLUMN client_submission_id CHAR(36) NULL,
    ADD COLUMN client_submission_payload_hash BINARY(32) NULL,
    ADD UNIQUE INDEX uk_record_user_client_submission (user_id, client_submission_id),
    ADD INDEX idx_record_user_event_created_at_id (user_id, event_type, created_at, id);
