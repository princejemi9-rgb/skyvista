-- Run once in the Supabase SQL editor. All prices are integer NGN kobo.
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users on delete cascade, full_name text not null default '', phone text not null default '', role text not null default 'customer' check(role in ('customer','admin')), created_at timestamptz not null default now());
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin'); $$;
create table public.destinations(id text primary key,city text not null,country text not null,airport text not null,image text not null,active boolean not null default true);
create table public.offers(id text primary key,title text not null,code text not null unique,discount integer not null check(discount between 0 and 30),active boolean not null default true);
create table public.inventory(id text primary key,airline text not null unique check(airline in ('BA','EK','QR','TK')),active boolean not null default true,multiplier numeric not null default 1 check(multiplier between 0.5 and 3));
create table public.settings(id text primary key,value jsonb not null);
create table public.bookings(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),reference text not null unique,idempotency_key uuid not null,status text not null default 'pending' check(status in ('pending','test_confirmed','cancelled')),source text not null default 'simulated' check(source='simulated'),currency text not null default 'NGN' check(currency='NGN'),total bigint not null check(total>0),price jsonb not null,flights jsonb not null,passengers jsonb not null,seats jsonb not null,bags jsonb not null,email text not null,phone text not null,promo text not null default '',created_at timestamptz not null default now(),unique(user_id,idempotency_key));
create table public.transactions(id uuid primary key default gen_random_uuid(),booking_id uuid not null unique references public.bookings(id),reference text not null unique,status text not null default 'initializing' check(status in ('initializing','pending','failed','success')),amount bigint not null,currency text not null default 'NGN' check(currency='NGN'),domain text not null default 'test' check(domain='test'),authorization_url text,provider_id text unique,created_at timestamptz not null default now(),verified_at timestamptz);
create index bookings_user_created on public.bookings(user_id,created_at desc);
create index bookings_status on public.bookings(status);
alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.offers enable row level security;
alter table public.inventory enable row level security;
alter table public.settings enable row level security;
alter table public.bookings enable row level security;
alter table public.transactions enable row level security;
revoke all on public.profiles,public.destinations,public.offers,public.inventory,public.settings,public.bookings,public.transactions from anon,authenticated;
grant all on public.profiles,public.destinations,public.offers,public.inventory,public.settings,public.bookings,public.transactions to service_role;
grant select on public.destinations,public.offers,public.inventory,public.settings to anon,authenticated;
grant select on public.profiles,public.bookings,public.transactions to authenticated;
grant update(full_name,phone) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy destinations_read on public.destinations for select using(active or public.is_admin());
create policy offers_read on public.offers for select using(active or public.is_admin());
create policy inventory_read on public.inventory for select using(true);
create policy settings_read on public.settings for select using(true);
create policy bookings_read on public.bookings for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy transactions_read on public.transactions for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and (b.user_id=auth.uid() or public.is_admin())));
-- Only server-side service-role code may create bookings or write payment state.
create function public.confirm_test_payment(p_reference text,p_amount bigint,p_currency text,p_provider_id text) returns uuid language plpgsql security definer set search_path=public as $$
declare t public.transactions; b public.bookings;
begin
 select * into t from transactions where reference=p_reference for update;
 if not found then raise exception 'Unknown transaction'; end if;
 select * into b from bookings where id=t.booking_id for update;
 if t.domain<>'test' or t.amount<>p_amount or b.total<>p_amount or p_currency<>'NGN' or b.currency<>p_currency then raise exception 'Payment amount or currency mismatch'; end if;
 if t.status='success' then return b.id; end if;
 if b.status<>'pending' then raise exception 'Booking is not payable'; end if;
 update transactions set status='success',provider_id=p_provider_id,verified_at=now() where id=t.id;
 update bookings set status='test_confirmed' where id=b.id;
 return b.id;
end; $$;
revoke all on function public.confirm_test_payment(text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.confirm_test_payment(text,bigint,text,text) to service_role;
create function public.cancel_unpaid_booking(p_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 perform 1 from bookings where id=p_id and status='pending' for update;
 if not found then raise exception 'Only pending bookings can be cancelled'; end if;
 if exists(select 1 from transactions where booking_id=p_id) then raise exception 'A checkout has already started; cancellation is unavailable'; end if;
 update bookings set status='cancelled' where id=p_id;
end; $$;
revoke all on function public.cancel_unpaid_booking(uuid) from public,anon,authenticated;
grant execute on function public.cancel_unpaid_booking(uuid) to service_role;
-- Serialize payment creation with cancellation using the booking row lock.
create function public.claim_test_checkout(p_booking uuid,p_reference text) returns public.transactions language plpgsql security definer set search_path=public as $$
declare b public.bookings; t public.transactions;
begin
 select * into b from bookings where id=p_booking for update;
 if not found or b.status<>'pending' then raise exception 'Booking is not payable'; end if;
 select * into t from transactions where booking_id=p_booking;
 if found then return t; end if;
 insert into transactions(booking_id,reference,amount) values(b.id,p_reference,b.total) returning * into t;
 return t;
end; $$;
revoke all on function public.claim_test_checkout(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_test_checkout(uuid,text) to service_role;
insert into public.inventory(id,airline) values('BA','BA'),('EK','EK'),('QR','QR'),('TK','TK');
insert into public.destinations values
('new-york','New York','United States','JFK','/images/new-york.jpg',true),
('london','London','United Kingdom','LHR','/images/london.jpg',true),
('dubai','Dubai','United Arab Emirates','DXB','/images/dubai.jpg',true),
('paris','Paris','France','CDG','/images/paris.jpg',true),
('istanbul','Istanbul','Türkiye','IST','/images/istanbul.jpg',true);
insert into public.offers values('sky30','Fly More, Save More','SKY30',30,true);
insert into public.settings values('website','{"brand":"SkyVista","tagline":"Fly Beyond Boundaries","supportEmail":"","bookingEnabled":true}');
