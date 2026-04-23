ALTER TABLE records
    DROP INDEX idx_record_user_id,
    ADD INDEX idx_record_user_created_at (user_id, created_at);

ALTER TABLE posts
    DROP INDEX idx_post_category,
    ADD INDEX idx_post_category_created_at_id (category, created_at, id),
    ADD INDEX idx_post_created_at_id (created_at, id);
