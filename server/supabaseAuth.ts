import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials: SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Attach user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export function setupAuth(app: Express) {
  // Signup route
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Create user record in our database
      if (data.user) {
        try {
          await storage.createUser({
            id: data.user.id,
            email: email,
            firstName: firstName,
            lastName: lastName,
          });
        } catch (dbError) {
          console.error('Failed to create user in database:', dbError);
          // Continue anyway - user exists in Supabase
        }
      }

      res.json({ 
        user: data.user,
        session: data.session,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Failed to sign up' });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Ensure user exists in our database (for users who signed up before sync was added)
      if (data.user) {
        try {
          const existingUser = await storage.getUser(data.user.id);
          if (!existingUser) {
            await storage.createUser({
              id: data.user.id,
              email: data.user.email || '',
              firstName: data.user.user_metadata?.first_name,
              lastName: data.user.user_metadata?.last_name,
            });
          }
        } catch (dbError) {
          console.error('Failed to sync user to database:', dbError);
          // Continue anyway - user exists in Supabase
        }
      }

      res.json({
        user: data.user,
        session: data.session,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await supabase.auth.admin.signOut(token);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to log out' });
    }
  });

  // Get current user route
  app.get('/api/auth/user', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name,
        profileImageUrl: user.user_metadata?.avatar_url,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(401).json({ message: 'Unauthorized' });
    }
  });
}
