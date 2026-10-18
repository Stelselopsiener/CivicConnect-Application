-- 1. DROP EXISTING TABLES (Reverse dependency order to avoid constraint errors)
DROP TABLE IF EXISTS public.log CASCADE;
DROP TABLE IF EXISTS public.action CASCADE;
DROP TABLE IF EXISTS public.service_request CASCADE;
DROP TABLE IF EXISTS public.staff_category CASCADE;
DROP TABLE IF EXISTS public.verification_token CASCADE;
DROP TABLE IF EXISTS public."user" CASCADE;
DROP TABLE IF EXISTS public.action_type CASCADE;
DROP TABLE IF EXISTS public.action_status CASCADE;
DROP TABLE IF EXISTS public.category CASCADE;

-- 2. CREATE LOOKUP TABLES (No foreign keys)
CREATE TABLE public.category (
  category_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  target_days integer NOT NULL DEFAULT 10,
  CONSTRAINT category_pkey PRIMARY KEY (category_id)
);

CREATE TABLE public.action_status (
  status_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  CONSTRAINT action_status_pkey PRIMARY KEY (status_id)
);

CREATE TABLE public.action_type (
  action_type_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  CONSTRAINT action_type_pkey PRIMARY KEY (action_type_id)
);

-- 3. CREATE BASE TABLES
CREATE TABLE public."user" (
  user_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  user_type text NOT NULL DEFAULT 'requester'::text CHECK (user_type = ANY (ARRAY['requester'::text, 'staff'::text, 'management'::text])),
  email_verified boolean NOT NULL DEFAULT false,
  CONSTRAINT user_pkey PRIMARY KEY (user_id)
);

-- 4. CREATE DEPENDENT TABLES (Contains foreign keys)
CREATE TABLE public.verification_token (
  token_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0 AND failed_attempts <= 5),
  CONSTRAINT verification_token_pkey PRIMARY KEY (token_id),
  CONSTRAINT verification_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id)
);

CREATE TABLE public.staff_category (
  user_id integer NOT NULL,
  category_id integer NOT NULL,
  CONSTRAINT staff_category_pkey PRIMARY KEY (user_id, category_id),
  CONSTRAINT staff_category_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id),
  CONSTRAINT staff_category_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id)
);

CREATE TABLE public.service_request (
  service_request_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  requester_id integer NOT NULL,
  category_id integer NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  street_address text NOT NULL,
  CONSTRAINT service_request_pkey PRIMARY KEY (service_request_id),
  CONSTRAINT service_request_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public."user"(user_id),
  CONSTRAINT service_request_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id)
);

CREATE TABLE public.action (
  action_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  service_request_id bigint NOT NULL,
  staff_id integer,
  performed_by integer NOT NULL,
  status_id integer NOT NULL,
  action_type_id integer NOT NULL,
  date timestamp with time zone NOT NULL DEFAULT now(),
  comment text,
  CONSTRAINT action_pkey PRIMARY KEY (action_id),
  CONSTRAINT action_action_type_id_fkey FOREIGN KEY (action_type_id) REFERENCES public.action_type(action_type_id),
  CONSTRAINT action_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_request(service_request_id),
  CONSTRAINT action_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public."user"(user_id),
  CONSTRAINT action_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public."user"(user_id),
  CONSTRAINT action_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.action_status(status_id)
);

CREATE TABLE public.log (
  log_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  table_name text,
  record_id bigint,
  operation text,
  changed_details text,
  changed_by integer,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  error_message text,
  CONSTRAINT log_pkey PRIMARY KEY (log_id)
);

-- 5. SEED REQUIRED LOOKUP DATA FOR TESTS
INSERT INTO public.action_status (name) VALUES 
  ('Pending'), ('Accepted'), ('In Progress'), ('Completed'), ('Closed'), ('Rejected'), ('Cancelled');

INSERT INTO public.action_type (name) VALUES 
  ('submitted'), ('status_change'), ('comment'), ('assigned'), ('category_update');

INSERT INTO public.category (name, target_days) VALUES 
  ('Facility fault', 10), 
  ('Equipment damage', 10), 
  ('Security concern', 10), 
  ('IT support', 10), 
  ('Maintenance', 10), 
  ('Lost property', 10), 
  ('Other', 10);
