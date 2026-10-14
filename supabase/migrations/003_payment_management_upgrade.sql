-- Additive payment-management upgrade. Run after 001 and 002.
alter table public.bank_accounts add column if not exists routing_information text not null default '' check (char_length(routing_information) <= 240);

create table if not exists public.bitcoin_wallets (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Bitcoin (BTC)' check (char_length(display_name) between 2 and 60),
  wallet_address text not null check (char_length(wallet_address) between 8 and 200),
  network text not null default 'Bitcoin' check (char_length(network) between 2 and 80),
  instructions text not null default '' check (char_length(instructions) <= 3000),
  qr_path text unique,
  enabled boolean not null default true,
  display_order integer not null default 0 check (display_order between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.bitcoin_wallets(display_name,wallet_address,network,instructions,enabled,display_order)
select display_name,wallet_address,network,instructions,true,0
from public.crypto_payment_settings
where id='bitcoin' and wallet_address <> ''
  and not exists (select 1 from public.bitcoin_wallets);

alter table public.bitcoin_wallets enable row level security;
revoke all on public.bitcoin_wallets from anon, authenticated;
grant all on public.bitcoin_wallets to service_role;
grant select on public.bitcoin_wallets to anon, authenticated;
drop policy if exists bitcoin_wallets_public on public.bitcoin_wallets;
create policy bitcoin_wallets_public on public.bitcoin_wallets for select
  using (enabled and exists(select 1 from public.payment_methods where id='bitcoin' and enabled));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-qr','payment-qr',false,1048576,array['image/png','image/svg+xml'])
on conflict(id) do update set public=false,file_size_limit=1048576,allowed_mime_types=array['image/png','image/svg+xml'];

drop policy if exists payment_qr_no_direct_access on storage.objects;
create policy payment_qr_no_direct_access on storage.objects for all to authenticated
  using (bucket_id='payment-qr' and false) with check (bucket_id='payment-qr' and false);

create index if not exists bitcoin_wallets_enabled_idx on public.bitcoin_wallets(enabled,display_order);
create index if not exists payments_method_status_idx on public.payments(method_id,status,created_at desc);

notify pgrst, 'reload schema';
