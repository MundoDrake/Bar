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
        return c.json({ error: 'Invalid token' }, 401)
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
        if (!profile) return c.json(null, 404)
        return c.json(profile)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// Create profile
app.post('/api/users/profile', async (c) => {
    // @ts-ignore
    const userId = c.get('user').userId
    const { custom_id } = await c.req.json()

    try {
        // Double check if user exists (handled by DB unique constraint too)
        await c.env.DB.prepare('INSERT INTO user_profiles (id, user_id, custom_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), userId, custom_id).run()
        return c.json({ success: true, custom_id })
    } catch (e: any) {
        // Handle unique constraint violation (Race condition)
        if (e.message.includes('UNIQUE constraint failed')) {
            const existing = await c.env.DB.prepare('SELECT custom_id FROM user_profiles WHERE user_id = ?').bind(userId).first()
            // @ts-ignore
            if (existing) return c.json({ success: true, custom_id: existing.custom_id })
        }
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

export default app
