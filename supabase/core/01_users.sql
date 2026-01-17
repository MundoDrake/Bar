-- =============================================
-- GESTÃO BAR - CORE TABLES
-- Supabase PostgreSQL
-- =============================================
-- Main database tables for the application.
-- Run this first when setting up a new database.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER PROFILES
-- Custom IDs for team invites and user identification
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_id VARCHAR(12) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER PREFERENCES
-- Alert and notification settings
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_low_stock BOOLEAN DEFAULT TRUE,
    alert_expiry BOOLEAN DEFAULT TRUE,
    alert_expiry_days INTEGER DEFAULT 7,
    alert_ai_suggestions BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
