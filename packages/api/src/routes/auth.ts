import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';

export const authRouter = new Hono();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@localnotification.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const JWT_SECRET = process.env.JWT_SECRET || 'localnotification-secret-key-change-in-production';

authRouter.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  
  if (body.email === ADMIN_EMAIL && body.password === ADMIN_PASSWORD) {
    const token = await sign(
      { 
        email: body.email, 
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      }, 
      JWT_SECRET
    );
    
    return c.json({ success: true, token });
  }
  
  return c.json({ success: false, error: 'Invalid credentials' }, 401);
});

authRouter.post('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ valid: false }, 401);
  }
  
  const token = authHeader.slice(7);
  
  try {
    const payload = await verify(token, JWT_SECRET);
    return c.json({ valid: true, email: payload.email });
  } catch {
    return c.json({ valid: false }, 401);
  }
});

authRouter.post('/logout', (c) => {
  return c.json({ success: true });
});

