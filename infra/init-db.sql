-- init-db.sql
-- Runs on first PostgreSQL container start.
-- Creates the TimescaleDB database and enables extensions.

-- Create the time-series database (main DB is created by POSTGRES_DB env var)
SELECT 'CREATE DATABASE levoit_ts'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'levoit_ts')\gexec

-- Enable TimescaleDB extension in both databases
\c levoit_geo
CREATE EXTENSION IF NOT EXISTS timescaledb;

\c levoit_ts
CREATE EXTENSION IF NOT EXISTS timescaledb;
