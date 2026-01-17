# Supabase Database Schema

This directory contains the database schema for Gestão Bar, organized by functionality.

## Structure

```
supabase/
├── core/                    # Main schema files (run in order)
│   ├── 01_users.sql         # User profiles & preferences
│   ├── 02_teams.sql         # Teams & team members
│   ├── 03_products.sql      # Products, stock, movements, batches
│   ├── 04_rls_policies.sql  # Row Level Security policies
│   └── 05_triggers_functions.sql  # Triggers & RPC functions
├── migrations/              # Future incremental changes
└── schema_v3.sql            # Full consolidated schema (legacy)
```

## Setup Instructions

### Fresh Install

Run the files in order in the Supabase SQL Editor:

1. `core/01_users.sql`
2. `core/02_teams.sql`
3. `core/03_products.sql`
4. `core/04_rls_policies.sql`
5. `core/05_triggers_functions.sql`

Or run `schema_v3.sql` for the full consolidated schema.

### Adding Migrations

Create new migration files in `migrations/` with the format:
```
YYYYMMDD_description.sql
```

Example: `20260117_add_product_images.sql`

## Tables Overview

| Table | Description |
|-------|-------------|
| `user_profiles` | Custom IDs for team invites |
| `user_preferences` | Alert settings per user |
| `teams` | Shared dashboards/workspaces |
| `team_members` | Links users to teams with roles |
| `products` | Product catalog (shared by team) |
| `stock` | Current stock levels |
| `stock_movements` | Stock change history |
| `product_batches` | Expiry tracking |

## Security

All tables use Row Level Security (RLS) with team-based access:
- Team members can view/edit products from their team
- Owners have full management access
- Users can only manage their own preferences
