import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { verifySupabaseToken } from './auth'
import { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// Middleware: Verify Auth on /api/* routes (except public ones if any)
app.use('/api/*', async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
        return c.json({ error: 'Missing Authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    // Use env vars from the binding
    const result = await verifySupabaseToken(token, c.env.SUPABASE_URL)

    if (!result.valid) {
        // Return detailed error for debugging
        return c.json({ error: result.error || 'Invalid token' }, 401)
    }

    // Attach user info to context if needed
    c.set('user', result)
    await next()
})

app.get('/api/health', (c) => {
    return c.json({ status: 'ok', message: 'Worker is running', db_status: 'connected' })
})

// --- USER PROFILES API ---

// Get my profile
app.get('/api/users/profile', async (c) => {
    // @ts-ignore
    const userId = c.get('user').userId
    try {
        const profile = await c.env.DB.prepare('SELECT * FROM user_profiles WHERE user_id = ?').bind(userId).first()
        if (!profile) {
            return c.json({ error: 'Profile not found', status: 404 }, 404)
        }
        return c.json(profile)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Create profile
app.post('/api/users/profile', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const userId = user.userId
    const email = user.email || null
    const { custom_id } = await c.req.json()

    try {
        // First, ensure the user exists in the users table (upsert)
        await c.env.DB.prepare(`
            INSERT INTO users (id, email, last_seen_at) 
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET last_seen_at = datetime('now'), email = COALESCE(excluded.email, users.email)
        `).bind(userId, email).run()

        // Now create the profile
        await c.env.DB.prepare('INSERT INTO user_profiles (id, user_id, custom_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), userId, custom_id).run()
        return c.json({ success: true, custom_id })
    } catch (e: any) {
        // Handle unique constraint violation (Race condition)
        if (e.message.includes('UNIQUE constraint failed')) {
            const existing = await c.env.DB.prepare('SELECT custom_id FROM user_profiles WHERE user_id = ?').bind(userId).first()
            // @ts-ignore
            if (existing) return c.json({ success: true, custom_id: existing.custom_id })
        }
        console.error('Error creating profile:', e)
        return c.json({ error: e.message }, 500)
    }
})

// Update profile (display_name)
app.put('/api/users/profile', async (c) => {
    // @ts-ignore
    const userId = c.get('user').userId
    const { display_name } = await c.req.json()

    try {
        await c.env.DB.prepare(`
            UPDATE user_profiles SET display_name = ?, updated_at = datetime('now') WHERE user_id = ?
        `).bind(display_name, userId).run()
        return c.json({ success: true })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Lookup user by custom_id (for adding members)
app.get('/api/users/lookup/:customId', async (c) => {
    const customId = c.req.param('customId')

    try {
        const profile = await c.env.DB.prepare('SELECT user_id, display_name FROM user_profiles WHERE custom_id = ?').bind(customId.toUpperCase()).first()
        if (!profile) {
            return c.json({ error: 'User not found' }, 404)
        }
        return c.json(profile)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// --- USER PREFERENCES API ---

// Get preferences
app.get('/api/users/preferences', async (c) => {
    // @ts-ignore
    const userId = c.get('user').userId

    try {
        const prefs = await c.env.DB.prepare('SELECT * FROM user_preferences WHERE user_id = ?').bind(userId).first()
        if (!prefs) {
            return c.json({ error: 'Preferences not found', status: 404 }, 404)
        }
        return c.json(prefs)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Create preferences (with defaults)
app.post('/api/users/preferences', async (c) => {
    // @ts-ignore
    const userId = c.get('user').userId
    const body = await c.req.json().catch(() => ({}))

    const defaults = {
        alert_low_stock: 1,
        alert_expiry: 1,
        alert_expiry_days: 7,
        alert_ai_suggestions: 1,
    }

    const prefs = { ...defaults, ...body }

    try {
        await c.env.DB.prepare(`
            INSERT INTO user_preferences (id, user_id, alert_low_stock, alert_expiry, alert_expiry_days, alert_ai_suggestions)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            userId,
            prefs.alert_low_stock ? 1 : 0,
            prefs.alert_expiry ? 1 : 0,
            prefs.alert_expiry_days,
            prefs.alert_ai_suggestions ? 1 : 0
        ).run()

        const created = await c.env.DB.prepare('SELECT * FROM user_preferences WHERE user_id = ?').bind(userId).first()
        return c.json(created)
    } catch (e: any) {
        // If already exists, return existing
        if (e.message.includes('UNIQUE constraint failed')) {
            const existing = await c.env.DB.prepare('SELECT * FROM user_preferences WHERE user_id = ?').bind(userId).first()
            return c.json(existing)
        }
        return c.json({ error: e.message }, 500)
    }
})

// Update preferences
app.put('/api/users/preferences', async (c) => {
    // @ts-ignore
    const userId = c.get('user').userId
    const body = await c.req.json()

    try {
        // Build dynamic update query
        const updates: string[] = []
        const values: any[] = []

        if (body.alert_low_stock !== undefined) {
            updates.push('alert_low_stock = ?')
            values.push(body.alert_low_stock ? 1 : 0)
        }
        if (body.alert_expiry !== undefined) {
            updates.push('alert_expiry = ?')
            values.push(body.alert_expiry ? 1 : 0)
        }
        if (body.alert_expiry_days !== undefined) {
            updates.push('alert_expiry_days = ?')
            values.push(body.alert_expiry_days)
        }
        if (body.alert_ai_suggestions !== undefined) {
            updates.push('alert_ai_suggestions = ?')
            values.push(body.alert_ai_suggestions ? 1 : 0)
        }

        if (updates.length === 0) {
            return c.json({ error: 'No fields to update' }, 400)
        }

        updates.push("updated_at = datetime('now')")
        values.push(userId)

        await c.env.DB.prepare(`UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`).bind(...values).run()

        const updated = await c.env.DB.prepare('SELECT * FROM user_preferences WHERE user_id = ?').bind(userId).first()
        return c.json(updated)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})


// --- TEAMS API ---

app.get('/api/teams', async (c) => {
    // @ts-ignore - Hono context type inference limitation with c.set
    const user = c.get('user')
    const userId = user.userId

    try {
        // Fetch teams where user is a member
        const { results } = await c.env.DB.prepare(`
            SELECT t.*, tm.role 
            FROM teams t
            JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = ?
        `).bind(userId).all()

        return c.json(results)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Create Team
app.post('/api/teams', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const { name } = await c.req.json()
    const teamId = crypto.randomUUID()
    const memberId = crypto.randomUUID()

    try {
        const statements = [
            c.env.DB.prepare('INSERT INTO teams (id, name, owner_user_id) VALUES (?, ?, ?)').bind(teamId, name, user.userId),
            c.env.DB.prepare('INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?)').bind(memberId, teamId, user.userId, 'owner')
        ]
        await c.env.DB.batch(statements)
        return c.json({ id: teamId, name, owner_user_id: user.userId })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Add Member
app.post('/api/teams/:id/members', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const teamId = c.req.param('id')
    const { user_id: memberUserId } = await c.req.json() // The user being invited
    const memberId = crypto.randomUUID()

    try {
        // Verify permissions (only owner can add)
        const team = await c.env.DB.prepare('SELECT owner_user_id FROM teams WHERE id = ?').bind(teamId).first() as any
        if (!team) return c.json({ error: 'Team not found' }, 404)
        if (team.owner_user_id !== user.userId) return c.json({ error: 'Forbidden' }, 403)

        // Add member
        await c.env.DB.prepare('INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?)').bind(memberId, teamId, memberUserId, 'member').run()
        return c.json({ success: true })
    } catch (e: any) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return c.json({ error: 'User is already a member' }, 409)
        }
        return c.json({ error: e.message }, 500)
    }
})

// Join team by owner's custom_id
app.post('/api/teams/join', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const userId = user.userId
    const { owner_custom_id } = await c.req.json()

    if (!owner_custom_id) {
        return c.json({ error: 'owner_custom_id is required' }, 400)
    }

    try {
        // 1. Find the owner user by their custom_id
        const ownerProfile = await c.env.DB.prepare(`
            SELECT user_id FROM user_profiles WHERE custom_id = ?
        `).bind(owner_custom_id.toUpperCase()).first() as any

        if (!ownerProfile) {
            return c.json({ error: 'User not found with this ID' }, 404)
        }

        const ownerUserId = ownerProfile.user_id

        // Prevent joining own team with own ID
        if (ownerUserId === userId) {
            return c.json({ error: 'You cannot join your own team' }, 400)
        }

        // 2. Find the team owned by this user
        const team = await c.env.DB.prepare(`
            SELECT id, name FROM teams WHERE owner_user_id = ?
        `).bind(ownerUserId).first() as any

        if (!team) {
            return c.json({ error: 'This user does not have a team' }, 404)
        }

        // 3. Check if already a member
        const existingMember = await c.env.DB.prepare(`
            SELECT id FROM team_members WHERE team_id = ? AND user_id = ?
        `).bind(team.id, userId).first()

        if (existingMember) {
            return c.json({ error: 'You are already a member of this team' }, 409)
        }

        // 4. Add user as member
        const memberId = crypto.randomUUID()
        await c.env.DB.prepare(`
            INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'member')
        `).bind(memberId, team.id, userId).run()

        return c.json({
            success: true,
            team_id: team.id,
            team_name: team.name,
            message: 'Successfully joined the team'
        })
    } catch (e: any) {
        console.error('Error joining team:', e)
        return c.json({ error: e.message }, 500)
    }
})

// --- PRODUCTS API ---

// Helper function to get user's active team
// If requestedTeamId is provided, validates user is a member of that team
async function getUserTeamId(db: any, userId: string, requestedTeamId?: string | null): Promise<string | null> {
    // If a specific team was requested, validate membership
    if (requestedTeamId) {
        const membership = await db.prepare(`
            SELECT tm.team_id
            FROM team_members tm
            WHERE tm.user_id = ? AND tm.team_id = ?
        `).bind(userId, requestedTeamId).first() as any

        if (membership) {
            return membership.team_id
        }
        // If user is not a member of requested team, fall through to default logic
        console.warn(`[Worker] User ${userId} requested team ${requestedTeamId} but is not a member`)
    }

    // Default: Get the first team the user is a member of (prioritize owned teams)
    const membership = await db.prepare(`
        SELECT tm.team_id, t.owner_user_id
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = ?
        ORDER BY CASE WHEN t.owner_user_id = tm.user_id THEN 0 ELSE 1 END
        LIMIT 1
    `).bind(userId).first() as any

    return membership?.team_id || null
}

app.get('/api/products', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const requestedTeamId = c.req.header('X-Team-Id')
    try {
        // Get user's team (respecting X-Team-Id header if provided)
        const teamId = await getUserTeamId(c.env.DB, user.userId, requestedTeamId)

        if (!teamId) {
            // User has no team - return empty array
            return c.json([])
        }

        // Fetch products for the team (shared dashboard)
        const results = await c.env.DB.prepare(`
            SELECT p.*, s.quantity as stock_quantity, s.updated_at as stock_updated_at
            FROM products p
            LEFT JOIN stock s ON p.id = s.product_id
            WHERE p.team_id = ?
            ORDER BY p.name
        `).bind(teamId).all()

        // Map to match expected frontend shape (nested stock object)
        const products = results.results.map((p: any) => ({
            ...p,
            stock: {
                id: p.id,
                product_id: p.id,
                quantity: p.stock_quantity || 0,
                updated_at: p.stock_updated_at
            }
        }))

        return c.json(products)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

app.post('/api/products', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const requestedTeamId = c.req.header('X-Team-Id')
    const { name, category, unit, min_stock_level, expiry_tracking, notes } = await c.req.json()
    const productId = crypto.randomUUID()
    const stockId = crypto.randomUUID()

    try {
        // Get user's team (respecting X-Team-Id header if provided)
        const teamId = await getUserTeamId(c.env.DB, user.userId, requestedTeamId)

        if (!teamId) {
            return c.json({ error: 'You need to be part of a team to create products' }, 400)
        }

        const statements = [
            c.env.DB.prepare(`
                INSERT INTO products (id, user_id, team_id, name, category, unit, min_stock_level, expiry_tracking, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(productId, user.userId, teamId, name, category, unit, min_stock_level || 0, expiry_tracking ? 1 : 0, notes),

            c.env.DB.prepare(`
                INSERT INTO stock (id, product_id, quantity)
                VALUES (?, ?, 0)
            `).bind(stockId, productId)
        ]

        await c.env.DB.batch(statements)
        return c.json({ success: true, id: productId })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

app.put('/api/products/:id', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const requestedTeamId = c.req.header('X-Team-Id')
    const id = c.req.param('id')
    const data = await c.req.json()

    try {
        // Get user's team (respecting X-Team-Id header if provided)
        const teamId = await getUserTeamId(c.env.DB, user.userId, requestedTeamId)
        if (!teamId) return c.json({ error: 'Forbidden' }, 403)

        // Verify product belongs to user's team
        const product = await c.env.DB.prepare('SELECT team_id FROM products WHERE id = ?').bind(id).first() as any
        if (!product) return c.json({ error: 'Not found' }, 404)
        if (product.team_id !== teamId) return c.json({ error: 'Forbidden' }, 403)

        await c.env.DB.prepare(`
            UPDATE products 
            SET name = ?, category = ?, unit = ?, min_stock_level = ?, expiry_tracking = ?, notes = ?, updated_at = datetime('now')
            WHERE id = ?
        `).bind(
            data.name,
            data.category,
            data.unit,
            data.min_stock_level,
            data.expiry_tracking ? 1 : 0,
            data.notes,
            id
        ).run()

        return c.json({ success: true })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

app.delete('/api/products/:id', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const requestedTeamId = c.req.header('X-Team-Id')
    const id = c.req.param('id')

    try {
        // Get user's team (respecting X-Team-Id header if provided)
        const teamId = await getUserTeamId(c.env.DB, user.userId, requestedTeamId)
        if (!teamId) return c.json({ error: 'Forbidden' }, 403)

        // Verify product belongs to user's team
        const product = await c.env.DB.prepare('SELECT team_id FROM products WHERE id = ?').bind(id).first() as any
        if (!product) return c.json({ error: 'Not found' }, 404)
        if (product.team_id !== teamId) return c.json({ error: 'Forbidden' }, 403)

        await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()
        return c.json({ success: true })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// --- STOCK API ---

// Register Movement
app.post('/api/stock/movement', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const requestedTeamId = c.req.header('X-Team-Id')
    const { product_id, type, quantity, reason, notes } = await c.req.json()
    const movementId = crypto.randomUUID()

    try {
        // Get user's team (respecting X-Team-Id header if provided)
        const teamId = await getUserTeamId(c.env.DB, user.userId, requestedTeamId)
        if (!teamId) return c.json({ error: 'Forbidden' }, 403)

        // Verify product belongs to user's team
        const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(product_id).first() as any
        if (!product) return c.json({ error: 'Product not found' }, 404)
        if (product.team_id !== teamId) return c.json({ error: 'Forbidden' }, 403)

        let delta = Number(quantity)
        if (type === 'saida' || type === 'perda') {
            delta = -delta
        }

        const statements = [
            c.env.DB.prepare(`
                INSERT INTO stock_movements (id, product_id, type, quantity, reason, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(movementId, product_id, type, quantity, reason, notes),

            c.env.DB.prepare(`
                UPDATE stock SET quantity = quantity + ?, updated_at = datetime('now') 
                WHERE product_id = ?
            `).bind(delta, product_id)
        ]

        await c.env.DB.batch(statements)
        return c.json({ success: true })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Get Movements History
app.get('/api/stock/movements', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const requestedTeamId = c.req.header('X-Team-Id')
    try {
        // Get user's team (respecting X-Team-Id header if provided)
        const teamId = await getUserTeamId(c.env.DB, user.userId, requestedTeamId)
        if (!teamId) return c.json([])

        const results = await c.env.DB.prepare(`
            SELECT m.*, p.name as product_name
            FROM stock_movements m
            JOIN products p ON m.product_id = p.id
            WHERE p.team_id = ?
            ORDER BY m.created_at DESC
            LIMIT 100
        `).bind(teamId).all()

        const movements = results.results.map((m: any) => ({
            ...m,
            product: { name: m.product_name }
        }))

        return c.json(movements)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Alerts & Summary
app.get('/api/stock/alerts', async (c) => {
    // @ts-ignore
    const user = c.get('user')
    const requestedTeamId = c.req.header('X-Team-Id')
    try {
        // Get user's team (respecting X-Team-Id header if provided)
        const teamId = await getUserTeamId(c.env.DB, user.userId, requestedTeamId)
        if (!teamId) {
            return c.json({ lowStock: [], summary: { total_items: 0, low_stock_count: 0 } })
        }

        const lowStock = await c.env.DB.prepare(`
            SELECT p.id, p.name, p.min_stock_level, p.unit, s.quantity
            FROM products p
            JOIN stock s ON p.id = s.product_id
            WHERE p.team_id = ? AND s.quantity <= p.min_stock_level
        `).bind(teamId).all()

        const summary = await c.env.DB.prepare(`
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN s.quantity <= p.min_stock_level THEN 1 ELSE 0 END) as low_stock_count
            FROM products p
            JOIN stock s ON p.id = s.product_id
            WHERE p.team_id = ?
        `).bind(teamId).first()

        return c.json({
            lowStock: lowStock.results,
            summary: summary
        })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Validation for Static Assets (SPA Fallback)
app.get('*', async (c) => {
    // @ts-ignore
    const assetsFetcher = c.env.ASSETS;
    if (!assetsFetcher) {
        return c.text('Assets binding not found', 500);
    }

    const url = new URL(c.req.url);
    // Try to fetch the exact asset (e.g. /main.js, /style.css)
    let response = await assetsFetcher.fetch(c.req.raw);

    // If not found (and not an API call, which is handled above), serve index.html for SPA routing
    if (response.status === 404 && !url.pathname.startsWith('/api/')) {
        response = await assetsFetcher.fetch(new URL('index.html', url.origin));
    }

    return response;
});

export default app
