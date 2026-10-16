-- 1. Clean up existing tables
DROP TABLE IF EXISTS "log" CASCADE;
DROP TABLE IF EXISTS action CASCADE;
DROP TABLE IF EXISTS service_request CASCADE;
DROP TABLE IF EXISTS staff_category CASCADE;
DROP TABLE IF EXISTS verification_token CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS action_type CASCADE;
DROP TABLE IF EXISTS action_status CASCADE;
DROP TABLE IF EXISTS category CASCADE;

-- 2. Create Core Lookup Tables
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE action_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE action_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 3. Create User & Authentication Tables
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'citizen',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEF-006 / TD-006 Fix: Functional index for case-insensitive email uniqueness
CREATE UNIQUE INDEX user_lower_email_idx ON "user" (LOWER(email));

CREATE TABLE verification_token (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Staff Mapping Table
CREATE TABLE staff_category (
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, category_id)
);

-- 5. Create Core Business Tables
CREATE TABLE service_request (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES category(id),
    status_id INTEGER NOT NULL REFERENCES action_status(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE action (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES service_request(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES "user"(id),
    action_type_id INTEGER NOT NULL REFERENCES action_type(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Audit Log Table
CREATE TABLE "log" (
    id SERIAL PRIMARY KEY,
    entity_name VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(255) NOT NULL,
    performed_by INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Insert Seed Data required for Jest Tests
-- Added "IT support" as ID 4 to satisfy TC-007
INSERT INTO category (name, description) VALUES
('Roads & Transport', 'Potholes, traffic lights, road markings'),
('Water & Sanitation', 'Burst pipes, sewage leaks, water supply'),
('Electricity', 'Power outages, streetlights, cable theft'),
('IT support', 'System issues, network outages');

INSERT INTO action_status (name) VALUES
('Pending'),
('Accepted'),
('In Progress'),
('Completed'),
('Rejected');

INSERT INTO action_type (name) VALUES
('Status Update'),
('Comment'),
('Internal Note');

-- Insert dummy test users (Added user 3 to satisfy TC-007)
INSERT INTO "user" (email, password_hash, role, is_verified) VALUES
('admin@civicconnect.test', 'dummy_hash', 'admin', true),
('staff@civicconnect.test', 'dummy_hash', 'staff', true),
('it_staff@civicconnect.test', 'dummy_hash', 'staff', true);

-- Assign staff user 2 to 'Roads & Transport' (Category 1)
-- Assign staff user 3 to 'IT support' (Category 4)
INSERT INTO staff_category (user_id, category_id) VALUES 
(2, 1),
(3, 4);