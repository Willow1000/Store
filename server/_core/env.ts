import fs from 'fs';
import dotenv from 'dotenv';

const dotenvPath = process.env.DOTENV_CONFIG_PATH || (fs.existsSync('.env.local') ? '.env.local' : '.env');
dotenv.config({ path: dotenvPath });

export const ENV = {
  appId: process.env.VITE_APP_ID ?? process.env.APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? process.env.COOKIE_SECRET ?? process.env.SESSION_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? process.env.VITE_FRONTEND_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? process.env.VITE_FRONTEND_FORGE_API_KEY ?? "",
  // Supabase Configuration
  supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  // Paystack Configuration
  paystackPublicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY ?? process.env.PAYSTACK_PUBLIC_KEY ?? "",
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
};
