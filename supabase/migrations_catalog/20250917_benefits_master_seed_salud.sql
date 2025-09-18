-- Seed canonical Salud benefits into plans_v3.benefits_master (idempotent)
-- This migration guarantees that the following benefit codes exist for category 'salud':
--   consultas_especialistas, hospitalizacion, cirugias, urgencias, maternidad
-- It sets sensible display names if they are missing. Does not alter raw plan data.

-- Ensure schema/table exist (safe no-ops if already created by prior migrations)
create schema if not exists plans_v3;
create table if not exists plans_v3.benefits_master (
  id bigserial primary key,
  category_slug text not null check (category_slug in ('autos','salud')),
  benefit_code text not null,
  name text,
  description text,
  created_at timestamptz not null default now(),
  unique (category_slug, benefit_code)
);

-- Upsert the required Salud benefits
insert into plans_v3.benefits_master (category_slug, benefit_code, name, description)
values
  ('salud', 'consultas_especialistas', 'Consultas con especialistas', 'Consultas con médicos especialistas'),
  ('salud', 'hospitalizacion', 'Hospitalización', 'Cobertura por hospitalización'),
  ('salud', 'cirugias', 'Cirugías', 'Cobertura de procedimientos y cirugías'),
  ('salud', 'urgencias', 'Urgencias', 'Atención de urgencias'),
  ('salud', 'maternidad', 'Maternidad', 'Controles y atención de maternidad')
on conflict (category_slug, benefit_code) do update
set
  name = coalesce(plans_v3.benefits_master.name, excluded.name),
  description = coalesce(plans_v3.benefits_master.description, excluded.description);

-- Optional: sanity check (no-op if run in transactional migration context)
-- select category_slug, benefit_code, name from plans_v3.benefits_master
-- where category_slug = 'salud' and benefit_code in (
--   'consultas_especialistas','hospitalizacion','cirugias','urgencias','maternidad'
-- );


