-- CivicConnect base schema + seeds for CI and local Postgres
-- Apply before tests: psql ... -f migrations/000_schema.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.category (
  category_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  target_days integer NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS public.action_status (
  status_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.action_type (
  action_type_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------------
-- Users (quoted: reserved word)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."user" (
  user_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  user_type text NOT NULL DEFAULT 'requester'
    CHECK (user_type = ANY (ARRAY['requester', 'staff', 'management'])),
  email_verified boolean NOT NULL DEFAULT false
);

-- Required by: ON CONFLICT ((LOWER(email))) in user/repository.js
CREATE UNIQUE INDEX IF NOT EXISTS user_email_lower_unique
  ON public."user" (LOWER(email));

CREATE TABLE IF NOT EXISTS public.verification_token (
  token_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  issued_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0
    CHECK (failed_attempts >= 0 AND failed_attempts <= 5)
);

CREATE INDEX IF NOT EXISTS verification_token_user_issued
  ON public.verification_token (user_id, issued_at DESC);

CREATE TABLE IF NOT EXISTS public.staff_category (
  user_id integer NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES public.category(category_id),
  PRIMARY KEY (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.service_request (
  service_request_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id integer NOT NULL REFERENCES public."user"(user_id),
  category_id integer NOT NULL REFERENCES public.category(category_id),
  title text NOT NULL,
  description text NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  street_address text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.action (
  action_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_request_id bigint NOT NULL REFERENCES public.service_request(service_request_id) ON DELETE CASCADE,
  staff_id integer REFERENCES public."user"(user_id),
  performed_by integer NOT NULL REFERENCES public."user"(user_id),
  status_id integer NOT NULL REFERENCES public.action_status(status_id),
  action_type_id integer NOT NULL REFERENCES public.action_type(action_type_id),
  date timestamptz NOT NULL DEFAULT now(),
  comment text
);

CREATE TABLE IF NOT EXISTS public.log (
  log_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text,
  record_id bigint,
  operation text,
  changed_details text,
  changed_by integer,
  changed_at timestamptz NOT NULL DEFAULT now(),
  error_message text
);

-- ---------------------------------------------------------------------------
-- Seeds (names must match repository LOWER(name) / category maps)
-- ---------------------------------------------------------------------------
INSERT INTO public.category (name, target_days) VALUES
  ('Facility fault', 7),
  ('Equipment damage', 10),
  ('Security concern', 2),
  ('IT support', 3),
  ('Maintenance', 7),
  ('Lost property', 14),
  ('Other', 10)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.action_status (name) VALUES
  ('pending'),
  ('in_progress'),
  ('accepted'),
  ('rejected'),
  ('completed'),
  ('cancelled'),
  ('closed')

ON CONFLICT (name) DO NOTHING;

INSERT INTO public.action_type (name) VALUES
  ('submitted'),
  ('assigned'),
  ('status_change'),
  ('comment'),
  ('category_update')
ON CONFLICT (name) DO NOTHING;

COMMIT;