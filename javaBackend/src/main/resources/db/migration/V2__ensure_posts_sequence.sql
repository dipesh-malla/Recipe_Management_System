-- Flyway migration: ensure posts_id_seq exists and is set as default for posts.id
-- Safe to run multiple times (CREATE SEQUENCE IF NOT EXISTS used)

CREATE SEQUENCE IF NOT EXISTS posts_id_seq;

ALTER TABLE posts ALTER COLUMN id SET DEFAULT nextval('posts_id_seq');

-- ensure sequence value is after current max id
SELECT setval('posts_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM posts), false);
