-- Vero authentication and access control run through NestJS, never PostgREST.
-- Owners retain access; no direct client policies are installed.
DO $$
DECLARE item record; role_name text;
BEGIN
 FOR item IN SELECT schemaname,tablename FROM pg_tables
 WHERE (schemaname='public' AND tablename IN ('users','auth_identities','sessions','password_reset_tokens','categories','shops','shop_links','reviews','media_assets','review_images','review_likes','review_comments','reports','moderation_actions','feed_snapshots','feed_snapshot_entries','_prisma_migrations'))
 OR schemaname='legacy_cloudops'
 LOOP
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',item.schemaname,item.tablename);
  EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC',item.schemaname,item.tablename);
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I',item.schemaname,item.tablename,role_name);
   END IF;
  END LOOP;
 END LOOP;
END $$;
