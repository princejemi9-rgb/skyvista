-- Operational payment controls. Run after 001_skyvista.sql.
create table public.payment_methods (
  id text primary key check (id in ('paystack','bank_transfer','bitcoin')),
  display_name text not null check (char_length(display_name) between 2 and 60),
  enabled boolean not null default false,
  instructions text not null default '' check (char_length(instructions) <= 3000),
  display_order integer not null default 0 check (display_order between 0 and 100),
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(), bank_name text not null check(char_length(bank_name) between 2 and 120), account_name text not null check(char_length(account_name) between 2 and 120), account_number text not null check(account_number ~ '^[A-Za-z0-9 -]{5,40}$'), currency text not null default 'NGN' check(currency ~ '^[A-Z]{3}$'), instructions text not null default '' check(char_length(instructions)<=3000), enabled boolean not null default true, display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
create table public.crypto_payment_settings (
  id text primary key default 'bitcoin' check(id='bitcoin'), display_name text not null default 'Bitcoin (BTC)', wallet_address text not null default '' check(char_length(wallet_address)<=200), network text not null default 'Bitcoin', instructions text not null default '' check(char_length(instructions)<=3000), updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id), method_id text not null references public.payment_methods(id), amount bigint not null check(amount>0), currency text not null check(currency ~ '^[A-Z]{3}$'), status text not null default 'unpaid' check(status in ('unpaid','pending','awaiting_verification','paid','rejected','refunded','failed')), customer_reference text check(char_length(customer_reference)<=160), admin_message text check(char_length(admin_message)<=3000), verification_note text check(char_length(verification_note)<=3000), reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(booking_id, method_id)
);
create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id) on delete cascade, storage_path text not null unique, mime_type text not null check(mime_type in ('image/jpeg','image/png','application/pdf')), byte_size integer not null check(byte_size between 1 and 5242880), submitted_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(), admin_id uuid not null references public.profiles(id), action text not null check(char_length(action)<=100), entity_type text not null check(char_length(entity_type)<=60), entity_id text not null check(char_length(entity_id)<=100), detail jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.bookings add column if not exists payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','awaiting_verification','paid','rejected','refunded','failed'));
alter table public.bookings add column if not exists booking_status text not null default 'payment_pending' check(booking_status in ('pending','payment_pending','confirmed','cancelled','completed'));
alter table public.bookings add column if not exists admin_notes text not null default '' check(char_length(admin_notes)<=5000);
alter table public.settings add column if not exists updated_at timestamptz not null default now();
insert into public.payment_methods(id,display_name,enabled,instructions,display_order) values
('paystack','Pay with Paystack',true,'Secure Paystack test checkout. Use test payment methods only.',10),
('bank_transfer','Bank Transfer',false,'Transfer the exact amount and submit your transfer reference for review.',20),
('bitcoin','Bitcoin (BTC)',false,'Send the exact amount and submit the transaction ID for manual verification.',30)
on conflict(id) do nothing;
insert into public.crypto_payment_settings(id) values('bitcoin') on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','application/pdf'];
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','application/pdf'];
create index payments_booking_idx on public.payments(booking_id); create index payments_status_idx on public.payments(status,created_at desc); create index audit_logs_entity_idx on public.admin_audit_logs(entity_type,entity_id,created_at desc);
alter table public.payment_methods enable row level security; alter table public.bank_accounts enable row level security; alter table public.crypto_payment_settings enable row level security; alter table public.payments enable row level security; alter table public.payment_proofs enable row level security; alter table public.admin_audit_logs enable row level security;
revoke all on public.payment_methods,public.bank_accounts,public.crypto_payment_settings,public.payments,public.payment_proofs,public.admin_audit_logs from anon,authenticated;
grant all on public.payment_methods,public.bank_accounts,public.crypto_payment_settings,public.payments,public.payment_proofs,public.admin_audit_logs to service_role;
grant select on public.payment_methods,public.bank_accounts,public.crypto_payment_settings to anon,authenticated;
grant select on public.payments,payment_proofs to authenticated;
create policy payment_methods_public on public.payment_methods for select using(enabled or public.is_admin());
create policy bank_accounts_public on public.bank_accounts for select using(enabled and exists(select 1 from public.payment_methods where id='bank_transfer' and enabled));
create policy crypto_settings_public on public.crypto_payment_settings for select using(exists(select 1 from public.payment_methods where id='bitcoin' and enabled));
create policy payments_owner_read on public.payments for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and (b.user_id=auth.uid() or public.is_admin())));
create policy proofs_owner_read on public.payment_proofs for select to authenticated using(exists(select 1 from public.payments p join public.bookings b on b.id=p.booking_id where p.id=payment_id and (b.user_id=auth.uid() or public.is_admin())));
create or replace function public.log_admin_action(p_action text,p_type text,p_id text,p_detail jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception 'Administrator access required'; end if; insert into admin_audit_logs(admin_id,action,entity_type,entity_id,detail) values(auth.uid(),p_action,p_type,p_id,p_detail); end; $$;
revoke all on function public.log_admin_action(text,text,text,jsonb) from public,anon; grant execute on function public.log_admin_action(text,text,text,jsonb) to authenticated,service_role;
create policy payment_proofs_no_direct_access on storage.objects for all to authenticated using(false) with check(false);
create policy payment_proofs_no_direct_access on storage.objects for all to authenticated using(false) with check(false);
