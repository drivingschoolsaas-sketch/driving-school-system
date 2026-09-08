-- ==================================================
-- Cleanup: Drop partially-created Phase 3 objects
-- ==================================================
-- Run this BEFORE re-running 00003_driving_school_core.sql
-- if it failed mid-way.

DROP TABLE IF EXISTS instructor_service_areas CASCADE;
DROP TABLE IF EXISTS lesson_packages CASCADE;
DROP TABLE IF EXISTS lesson_types CASCADE;
DROP TABLE IF EXISTS service_areas CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS instructors CASCADE;
DROP TABLE IF EXISTS school_settings CASCADE;

DROP TYPE IF EXISTS vehicle_status CASCADE;
DROP TYPE IF EXISTS lesson_type_status CASCADE;
DROP TYPE IF EXISTS transmission_type CASCADE;
DROP TYPE IF EXISTS package_status CASCADE;
