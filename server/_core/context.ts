import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { createClient } from "@supabase/supabase-js";
import * as db from "../db";

// Create a Supabase client for token verification.
// The anon key is sufficient for auth.getUser(token); prefer the service key when available.
const supabase = ENV.supabaseUrl
  ? createClient(
      ENV.supabaseUrl,
      ENV.supabaseServiceKey || ENV.supabaseAnonKey || ''
    )
  : null;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Method 1: Try SDK authentication (session cookie)
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) {
      console.log('[Auth] User authenticated via SDK session cookie');
      return {
        req: opts.req,
        res: opts.res,
        user,
      };
    }
  } catch (sdkError) {
    // SDK auth failed (expected for Supabase users), try Supabase token next
    console.debug('[Auth] SDK session cookie not found (expected for Supabase users)');
  }

  // Method 2: Try Supabase token from Authorization header
  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      console.log('[Auth] Attempting Supabase token verification');
      
      if (supabase) {
        // Verify the Supabase token and get user info
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
        
        if (error) {
          console.debug('[Auth] Supabase token verification failed:', error.message);
        } else if (supabaseUser?.id) {
          console.log('[Auth] Supabase token verified for user:', supabaseUser.id);
          
          // Look up user in our database by Supabase user ID
          const dbUser = await db.getUserByOpenId(supabaseUser.id);
          
          if (dbUser) {
            console.log('[Auth] User found in database:', dbUser.id);
            return {
              req: opts.req,
              res: opts.res,
              user: dbUser,
            };
          }
          
          // If user doesn't exist in DB, create them
          try {
            console.log('[Auth] Creating new user in database for Supabase user:', supabaseUser.id);
            await db.upsertUser({
              openId: supabaseUser.id,
              email: supabaseUser.email,
              name: supabaseUser.user_metadata?.name,
              loginMethod: supabaseUser.user_metadata?.provider || 'email',
              lastSignedIn: new Date(),
            });
            const newUser = await db.getUserByOpenId(supabaseUser.id);
            if (newUser) {
              console.log('[Auth] New user created successfully:', newUser.id);
              return {
                req: opts.req,
                res: opts.res,
                user: newUser,
              };
            }
          } catch (syncError) {
            console.error("[Auth] Failed to sync Supabase user:", syncError);
          }
        }
      } else {
        console.warn('[Auth] Supabase client not configured - check VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
      }
    } else {
      console.debug('[Auth] No Authorization header found');
    }
  } catch (supabaseError) {
    console.error("[Auth] Supabase token verification error:", supabaseError);
  }

  // No authentication method succeeded - user is unauthenticated (public access allowed)
  console.debug('[Auth] User is unauthenticated (public access)');
  return {
    req: opts.req,
    res: opts.res,
    user: null,
  };
}
