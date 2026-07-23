-- Estende get_advisor_summary() com conexões ativas (pg_stat_activity) e
-- cache hit ratio (pg_stat_database). Aditivo — mesma assinatura, só ganha
-- 2 chaves novas no jsonb de retorno.
create or replace function public.get_advisor_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_rls_initplan integer;
  v_multiple_permissive integer;
  v_unindexed_fk integer;
  v_seq_scan_total bigint;
  v_rows_total bigint;
  v_active_connections integer;
  v_cache_hit_ratio double precision;
begin
  with policies as (
    select
      nsp.nspname as schema_name,
      pc.relrowsecurity as is_rls_active,
      qual,
      with_check
    from pg_catalog.pg_policy pa
      join pg_catalog.pg_class pc on pa.polrelid = pc.oid
      join pg_catalog.pg_namespace nsp on pc.relnamespace = nsp.oid
      join pg_catalog.pg_policies pb
        on pc.relname = pb.tablename
        and nsp.nspname = pb.schemaname
        and pa.polname = pb.policyname
  )
  select count(*) into v_auth_rls_initplan
  from policies
  where is_rls_active
    and schema_name not in (
      '_timescaledb_cache','_timescaledb_catalog','_timescaledb_config','_timescaledb_internal',
      'auth','cron','extensions','graphql','graphql_public','information_schema','net','pgmq',
      'pgroonga','pgsodium','pgsodium_masks','pgtle','pgbouncer','pg_catalog','repack','storage',
      'supabase_functions','supabase_migrations','tiger','topology','vault'
    )
    and (
      (qual like '%auth.uid()%' and lower(qual) not like '%select auth.uid()%')
      or (qual like '%auth.jwt()%' and lower(qual) not like '%select auth.jwt()%')
      or (qual like '%auth.role()%' and lower(qual) not like '%select auth.role()%')
      or (qual like '%auth.email()%' and lower(qual) not like '%select auth.email()%')
      or (qual like '%current\_setting(%)%' and lower(qual) not like '%select current\_setting(%)%')
      or (with_check like '%auth.uid()%' and lower(with_check) not like '%select auth.uid()%')
      or (with_check like '%auth.jwt()%' and lower(with_check) not like '%select auth.jwt()%')
      or (with_check like '%auth.role()%' and lower(with_check) not like '%select auth.role()%')
      or (with_check like '%auth.email()%' and lower(with_check) not like '%select auth.email()%')
      or (with_check like '%current\_setting(%)%' and lower(with_check) not like '%select current\_setting(%)%')
    );

  with grouped as (
    select n.nspname, c.relname, r.rolname, act.cmd
    from pg_catalog.pg_policy p
      join pg_catalog.pg_class c on p.polrelid = c.oid
      join pg_catalog.pg_namespace n on c.relnamespace = n.oid
      join pg_catalog.pg_roles r
        on p.polroles @> array[r.oid] or p.polroles = array[0::oid]
      left join pg_catalog.pg_depend dep
        on c.oid = dep.objid and dep.deptype = 'e' and dep.classid = 'pg_catalog.pg_class'::regclass,
      lateral (
        select x.cmd
        from unnest((
          select case p.polcmd
            when 'r' then array['SELECT']
            when 'a' then array['INSERT']
            when 'w' then array['UPDATE']
            when 'd' then array['DELETE']
            when '*' then array['SELECT','INSERT','UPDATE','DELETE']
            else array['ERROR']
          end
        )) x(cmd)
      ) act(cmd)
    where c.relkind = 'r'
      and p.polpermissive
      and n.nspname not in (
        '_timescaledb_cache','_timescaledb_catalog','_timescaledb_config','_timescaledb_internal',
        'auth','cron','extensions','graphql','graphql_public','information_schema','net','pgmq',
        'pgroonga','pgsodium','pgsodium_masks','pgtle','pgbouncer','pg_catalog','realtime','repack',
        'storage','supabase_functions','supabase_migrations','tiger','topology','vault'
      )
      and r.rolname not like 'pg\_%'
      and r.rolname not like 'supabase%admin'
      and not r.rolbypassrls
      and dep.objid is null
    group by n.nspname, c.relname, r.rolname, act.cmd
    having count(1) > 1
  )
  select count(*) into v_multiple_permissive from grouped;

  with foreign_keys as (
    select
      ns.nspname as schema_name,
      cl.oid as table_oid,
      ct.conkey as col_attnums
    from pg_catalog.pg_constraint ct
      join pg_catalog.pg_class cl on ct.conrelid = cl.oid
      join pg_catalog.pg_namespace ns on cl.relnamespace = ns.oid
      left join pg_catalog.pg_depend d
        on d.objid = cl.oid and d.deptype = 'e' and d.classid = 'pg_catalog.pg_class'::regclass
    where ct.contype = 'f'
      and d.objid is null
      and ns.nspname not in ('pg_catalog','information_schema','auth','storage','vault','extensions')
  ),
  index_ as (
    select
      pi.indrelid as table_oid,
      indexrelid::regclass as index_,
      string_to_array(indkey::text, ' ')::smallint[] as col_attnums
    from pg_catalog.pg_index pi
    where indisvalid
  )
  select count(*) into v_unindexed_fk
  from foreign_keys fk
    left join index_ idx
      on fk.table_oid = idx.table_oid
      and fk.col_attnums = idx.col_attnums[1:array_length(fk.col_attnums, 1)]
    left join pg_catalog.pg_depend dep
      on idx.table_oid = dep.objid and dep.deptype = 'e' and dep.classid = 'pg_catalog.pg_class'::regclass
  where idx.index_ is null
    and fk.schema_name not in (
      '_timescaledb_cache','_timescaledb_catalog','_timescaledb_config','_timescaledb_internal',
      'auth','cron','extensions','graphql','graphql_public','information_schema','net','pgmq',
      'pgroonga','pgsodium','pgsodium_masks','pgtle','pgbouncer','pg_catalog','realtime','repack',
      'storage','supabase_functions','supabase_migrations','tiger','topology','vault'
    )
    and dep.objid is null;

  select coalesce(sum(seq_scan), 0), coalesce(sum(n_live_tup), 0)
    into v_seq_scan_total, v_rows_total
  from pg_stat_user_tables
  where schemaname = 'public';

  select count(*) into v_active_connections
  from pg_stat_activity
  where datname = current_database();

  select case when sum(blks_hit + blks_read) > 0
    then sum(blks_hit)::double precision / sum(blks_hit + blks_read)
    else null end
    into v_cache_hit_ratio
  from pg_stat_database
  where datname = current_database();

  return jsonb_build_object(
    'lints_total', v_auth_rls_initplan + v_multiple_permissive + v_unindexed_fk,
    'lints_by_type', jsonb_build_object(
      'auth_rls_initplan', v_auth_rls_initplan,
      'multiple_permissive_policies', v_multiple_permissive,
      'unindexed_foreign_keys', v_unindexed_fk
    ),
    'seq_scan_total', v_seq_scan_total,
    'rows_total', v_rows_total,
    'active_connections', v_active_connections,
    'cache_hit_ratio', v_cache_hit_ratio
  );
end;
$$;
