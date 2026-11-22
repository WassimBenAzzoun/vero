-- Forward-only Vero foundation. Never drop legacy data or rewrite earlier migrations.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
CREATE SCHEMA "legacy_cloudops";

-- Stop transactionally if normalizing email would merge distinct accounts.
DO $$ BEGIN
  IF EXISTS (SELECT lower(btrim(email)) FROM users GROUP BY lower(btrim(email)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Resolve duplicate normalized emails before migrating Vero';
  END IF;
END $$;
UPDATE users SET email = lower(btrim(email));

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('FR', 'AR');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'MERGED');

-- CreateEnum
CREATE TYPE "ShopPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'WEBSITE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'ABUSE', 'MISLEADING', 'WRONG_SHOP', 'DUPLICATE_SHOP', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationTarget" AS ENUM ('SHOP', 'REVIEW', 'COMMENT', 'USER', 'REPORT');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('HIDE', 'RESTORE', 'MERGE', 'CORRECT', 'SUSPEND', 'REACTIVATE', 'RESOLVE_REPORT', 'DISMISS_REPORT');

-- Map old roles explicitly without changing account IDs or credentials.
CREATE TYPE "roles_new" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "roles_new"
  USING (CASE WHEN "role"::text = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END)::"roles_new";
ALTER TYPE "roles" SET SCHEMA "legacy_cloudops";
ALTER TYPE "roles_new" RENAME TO "roles";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ADD COLUMN     "locale" "Locale" NOT NULL DEFAULT 'FR',
ALTER COLUMN "password_hash" DROP NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'USER',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);

-- Preserve legacy table and its foreign keys
ALTER TABLE "public"."projects" SET SCHEMA "legacy_cloudops";

-- Preserve legacy table and its foreign keys
ALTER TABLE "public"."project_members" SET SCHEMA "legacy_cloudops";

-- Preserve legacy table and its foreign keys
ALTER TABLE "public"."environments" SET SCHEMA "legacy_cloudops";

-- Preserve legacy table and its foreign keys
ALTER TABLE "public"."servers" SET SCHEMA "legacy_cloudops";

-- Preserve legacy table and its foreign keys
ALTER TABLE "public"."applications" SET SCHEMA "legacy_cloudops";

-- Preserve legacy table and its foreign keys
ALTER TABLE "public"."metrics" SET SCHEMA "legacy_cloudops";

-- Preserve legacy table and its foreign keys
ALTER TABLE "public"."alert_rules" SET SCHEMA "legacy_cloudops";

-- Preserve legacy table and its foreign keys
ALTER TABLE "public"."alerts" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."project_status" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."project_member_role" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."environment_type" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."server_provider" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."server_status" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."application_status" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."metric_type" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."alert_operator" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."alert_severity" SET SCHEMA "legacy_cloudops";

-- Preserve legacy enum
ALTER TYPE "public"."alert_status" SET SCHEMA "legacy_cloudops";

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "replacement_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category_id" UUID,
    "governorate" TEXT,
    "logo_asset_id" UUID,
    "created_by_id" UUID NOT NULL,
    "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "merged_into_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_links" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "platform" "ShopPlatform" NOT NULL,
    "original_url" TEXT NOT NULL,
    "normalized_url" TEXT NOT NULL,
    "identity_key" TEXT NOT NULL,
    "handle" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "submission_hash" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "text" TEXT NOT NULL,
    "product_name" VARCHAR(150),
    "purchase_date" DATE,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "thumbnail_key" TEXT,
    "mime_type" TEXT,
    "byte_size" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_images" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_likes" (
    "user_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_likes_pkey" PRIMARY KEY ("user_id","review_id")
);

-- CreateTable
CREATE TABLE "review_comments" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "shop_id" UUID,
    "review_id" UUID,
    "comment_id" UUID,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "resolution_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "target_type" "ModerationTarget" NOT NULL,
    "target_id" UUID NOT NULL,
    "action" "ModerationActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_snapshots" (
    "id" UUID NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feed_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_snapshot_entries" (
    "snapshot_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "feed_snapshot_entries_pkey" PRIMARY KEY ("snapshot_id","rank")
);

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_subject_key" ON "auth_identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_replacement_id_key" ON "sessions"("replacement_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "sessions_family_id_idx" ON "sessions"("family_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_key_key" ON "categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "shops_status_name_idx" ON "shops"("status", "name");

-- CreateIndex
CREATE INDEX "shops_category_id_idx" ON "shops"("category_id");

-- CreateIndex
CREATE INDEX "shops_created_by_id_idx" ON "shops"("created_by_id");

-- CreateIndex
CREATE INDEX "shops_merged_into_id_idx" ON "shops"("merged_into_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_links_identity_key_key" ON "shop_links"("identity_key");

-- CreateIndex
CREATE INDEX "shop_links_shop_id_idx" ON "shop_links"("shop_id");

-- CreateIndex
CREATE INDEX "reviews_status_created_at_id_idx" ON "reviews"("status", "created_at", "id");

-- CreateIndex
CREATE INDEX "reviews_shop_id_status_created_at_id_idx" ON "reviews"("shop_id", "status", "created_at", "id");

-- CreateIndex
CREATE INDEX "reviews_author_id_idx" ON "reviews"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_author_id_submission_id_key" ON "reviews"("author_id", "submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_uploader_id_status_idx" ON "media_assets"("uploader_id", "status");

-- CreateIndex
CREATE INDEX "media_assets_status_expires_at_idx" ON "media_assets"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_images_media_asset_id_key" ON "review_images"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_images_review_id_position_key" ON "review_images"("review_id", "position");

-- CreateIndex
CREATE INDEX "review_likes_review_id_created_at_user_id_idx" ON "review_likes"("review_id", "created_at", "user_id");

-- CreateIndex
CREATE INDEX "review_comments_review_id_status_created_at_id_idx" ON "review_comments"("review_id", "status", "created_at", "id");

-- CreateIndex
CREATE INDEX "review_comments_author_id_idx" ON "review_comments"("author_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_id_idx" ON "reports"("status", "created_at", "id");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_shop_id_idx" ON "reports"("shop_id");

-- CreateIndex
CREATE INDEX "reports_review_id_idx" ON "reports"("review_id");

-- CreateIndex
CREATE INDEX "reports_comment_id_idx" ON "reports"("comment_id");

-- CreateIndex
CREATE INDEX "moderation_actions_target_type_target_id_created_at_idx" ON "moderation_actions"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "moderation_actions_admin_id_idx" ON "moderation_actions"("admin_id");

-- CreateIndex
CREATE INDEX "feed_snapshots_expires_at_idx" ON "feed_snapshots"("expires_at");

-- CreateIndex
CREATE INDEX "feed_snapshot_entries_review_id_idx" ON "feed_snapshot_entries"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_snapshot_entries_snapshot_id_review_id_key" ON "feed_snapshot_entries"("snapshot_id", "review_id");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_replacement_id_fkey" FOREIGN KEY ("replacement_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_logo_asset_id_fkey" FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_links" ADD CONSTRAINT "shop_links_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "review_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_snapshot_entries" ADD CONSTRAINT "feed_snapshot_entries_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "feed_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_snapshot_entries" ADD CONSTRAINT "feed_snapshot_entries_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Database invariants not expressible as Prisma model attributes.
ALTER TABLE users ADD CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)) AND length(email) > 0);
ALTER TABLE shops ADD CONSTRAINT shops_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 150);
ALTER TABLE shops ADD CONSTRAINT shops_merge_target CHECK (
  (status = 'MERGED' AND merged_into_id IS NOT NULL AND merged_into_id <> id)
  OR (status <> 'MERGED' AND merged_into_id IS NULL));
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD CONSTRAINT reviews_text_length CHECK (char_length(btrim(text)) BETWEEN 10 AND 5000);
ALTER TABLE review_comments ADD CONSTRAINT review_comments_text_length CHECK (char_length(btrim(text)) BETWEEN 1 AND 2000);
ALTER TABLE review_images ADD CONSTRAINT review_images_position_range CHECK (position BETWEEN 0 AND 4);
ALTER TABLE reports ADD CONSTRAINT reports_one_target CHECK (num_nonnulls(shop_id, review_id, comment_id) = 1);
ALTER TABLE reports ADD CONSTRAINT reports_details_length CHECK (details IS NULL OR char_length(details) <= 2000);
ALTER TABLE reports ADD CONSTRAINT reports_resolution CHECK (
  (status = 'OPEN' AND resolved_by_id IS NULL AND resolved_at IS NULL AND resolution_reason IS NULL)
  OR (status <> 'OPEN' AND resolved_by_id IS NOT NULL AND resolved_at IS NOT NULL
      AND resolution_reason IS NOT NULL AND char_length(btrim(resolution_reason)) > 0));
ALTER TABLE sessions ADD CONSTRAINT sessions_expiry CHECK (expires_at > created_at);
ALTER TABLE sessions ADD CONSTRAINT sessions_not_self_replacement CHECK (replacement_id IS NULL OR replacement_id <> id);
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_expiry CHECK (expires_at > created_at);
ALTER TABLE feed_snapshots ADD CONSTRAINT feed_snapshots_expiry CHECK (expires_at > created_at);
ALTER TABLE feed_snapshot_entries ADD CONSTRAINT feed_snapshot_rank CHECK (rank > 0);
ALTER TABLE media_assets ADD CONSTRAINT media_ready_metadata CHECK (status <> 'READY' OR (
  byte_size IS NOT NULL AND byte_size > 0 AND byte_size <= 10485760
  AND width IS NOT NULL AND width > 0 AND height IS NOT NULL AND height > 0
  AND mime_type IS NOT NULL AND mime_type IN ('image/jpeg', 'image/png', 'image/webp')));
ALTER TABLE moderation_actions ADD CONSTRAINT moderation_reason CHECK (char_length(btrim(reason)) > 0);
COMMIT;
