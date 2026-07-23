-- Status SDK (Hub Bethel Sistemas, nível 2): heartbeat de presença de
-- usuários logados, consumido pela rota GET /api/status-check pra reportar
-- usuarios_online ao poller do Hub. Aditivo: tabela + função novas, não toca
-- em nada existente.

create table if not exists public.app_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now()
);

alter table public.app_presence enable row level security;

drop policy if exists "app_presence_upsert_self" on public.app_presence;
create policy "app_presence_upsert_self" on public.app_presence
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- SECURITY DEFINER pra rodar via client de sessão (anon key + cookies,
-- auth.uid() do usuário logado), chamado no middleware.
create or replace function public.bump_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_presence (user_id, last_seen)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set last_seen = excluded.last_seen
    where public.app_presence.last_seen < now() - interval '30 seconds';
end;
$$;

-- Rollback:
--   drop function if exists public.bump_presence();
--   drop table if exists public.app_presence;
