-- Additive international-transport foundation. Run after 001-004.
create table public.transport_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), reference text not null unique,
 request_type text not null check(request_type in ('person','goods')), status text not null default 'submitted' check(status in ('submitted','under_review','additional_information_required','quotation_available','quotation_accepted','awaiting_payment','payment_under_review','payment_verified','transport_confirmed','in_transit','arrived','completed','rejected','cancelled')),
 payer jsonb not null default '{}'::jsonb, details jsonb not null default '{}'::jsonb, departure_country text not null, destination_country text not null, departure_location text not null, destination_location text not null,
 preferred_date date, method text not null check(method in ('air','sea','road')), admin_notes text not null default '', carrier_name text, carrier_reference text, carrier_confirmation_details text, departure_at timestamptz, expected_arrival_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.transport_status_history (id uuid primary key default gen_random_uuid(), request_id uuid not null references public.transport_requests(id) on delete cascade, status text not null, location text, note text not null default '', recorded_by uuid references public.profiles(id), recorded_at timestamptz not null default now());
create table public.transport_quotations (id uuid primary key default gen_random_uuid(), request_id uuid not null references public.transport_requests(id) on delete cascade, amount bigint not null check(amount>0), currency text not null check(currency ~ '^[A-Z]{3}$'), details text not null default '', status text not null default 'offered' check(status in ('offered','accepted','declined','expired')), created_by uuid references public.profiles(id), created_at timestamptz not null default now(), accepted_at timestamptz);
create table public.customer_notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), title text not null, body text not null, read_at timestamptz, created_at timestamptz not null default now());
alter table public.transport_requests enable row level security; alter table public.transport_status_history enable row level security; alter table public.transport_quotations enable row level security; alter table public.customer_notifications enable row level security;
revoke all on public.transport_requests,public.transport_status_history,public.transport_quotations,public.customer_notifications from anon,authenticated;
grant all on public.transport_requests,public.transport_status_history,public.transport_quotations,public.customer_notifications to service_role;
grant select on public.transport_requests,public.transport_status_history,public.transport_quotations,public.customer_notifications to authenticated;
create policy transport_owner_read on public.transport_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy transport_history_read on public.transport_status_history for select to authenticated using(exists(select 1 from public.transport_requests r where r.id=request_id and (r.user_id=auth.uid() or public.is_admin())));
create policy transport_quotes_read on public.transport_quotations for select to authenticated using(exists(select 1 from public.transport_requests r where r.id=request_id and (r.user_id=auth.uid() or public.is_admin())));
create policy notifications_owner_read on public.customer_notifications for select to authenticated using(user_id=auth.uid() or public.is_admin());
create index transport_requests_user_created on public.transport_requests(user_id,created_at desc);
create index transport_requests_status on public.transport_requests(status,created_at desc);
notify pgrst, 'reload schema';
