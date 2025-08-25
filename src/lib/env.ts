// Environment configuration and validation utilities

interface EnvironmentConfig {
  // NextAuth Configuration
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  
  // Domain Configuration
  CANONICAL_DOMAIN: string;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
  
  // Supabase Configuration
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // OAuth Configuration
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  
  // Build Information
  BUILD_ID: string;
  COMMIT_SHA: string;
  BRANCH: string;
}

// Validate and normalize environment variables
function validateEnvironment(): EnvironmentConfig {
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Determine canonical domain
  const canonicalDomain = process.env.NEXT_PUBLIC_CANONICAL_DOMAIN || 
                          process.env.NEXTAUTH_URL || 
                          'https://brikiapp.com';

  // Ensure NEXTAUTH_URL is set correctly
  const nextAuthUrl = process.env.NEXTAUTH_URL || canonicalDomain;

  // Validate domain consistency
  const url = new URL(nextAuthUrl);
  const canonicalUrl = new URL(canonicalDomain);
  
  if (url.hostname !== canonicalUrl.hostname) {
    console.warn(`[ENV] Domain mismatch: NEXTAUTH_URL (${url.hostname}) vs CANONICAL_DOMAIN (${canonicalUrl.hostname})`);
  }

  return {
    NEXTAUTH_URL: nextAuthUrl,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    
    CANONICAL_DOMAIN: canonicalDomain,
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
    
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    
    BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || 
              process.env.NEXT_PUBLIC_BUILD_ID || 
              `local-${Date.now()}`,
    COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    BRANCH: process.env.VERCEL_GIT_COMMIT_REF || 'local',
  };
}

// Export validated environment config
export const env = validateEnvironment();

// Utility functions
export const getCanonicalUrl = (path: string = '') => {
  const url = new URL(path, env.CANONICAL_DOMAIN);
  return url.toString();
};

export const getNextAuthUrl = (path: string = '') => {
  const url = new URL(path, env.NEXTAUTH_URL);
  return url.toString();
};

export const isSameOrigin = (url: string) => {
  try {
    const urlObj = new URL(url);
    const canonicalObj = new URL(env.CANONICAL_DOMAIN);
    return urlObj.hostname === canonicalObj.hostname;
  } catch {
    return false;
  }
};

// Cookie domain configuration
export const getCookieDomain = () => {
  if (env.IS_DEVELOPMENT) {
    return undefined; // Use default in development
  }
  
  // In production, use the canonical domain
  const url = new URL(env.CANONICAL_DOMAIN);
  return url.hostname;
};

// CORS configuration
export const getCorsConfig = () => {
  if (env.IS_DEVELOPMENT) {
    return {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    };
  }
  
  return {
    origin: [env.CANONICAL_DOMAIN],
    credentials: true,
  };
};

// Build information for debugging
export const getBuildInfo = () => ({
  buildId: env.BUILD_ID,
  commitSha: env.COMMIT_SHA,
  branch: env.BRANCH,
  environment: env.IS_PRODUCTION ? 'production' : 'development',
  canonicalDomain: env.CANONICAL_DOMAIN,
  nextAuthUrl: env.NEXTAUTH_URL,
  timestamp: new Date().toISOString(),
});

// Environment validation for client-side
export const validateClientEnvironment = () => {
  const clientVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingVars = clientVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing client environment variables: ${missingVars.join(', ')}`);
    return false;
  }

  return true;
};

// Log environment configuration (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('[ENV] Environment configuration:', {
    canonicalDomain: env.CANONICAL_DOMAIN,
    nextAuthUrl: env.NEXTAUTH_URL,
    isProduction: env.IS_PRODUCTION,
    buildId: env.BUILD_ID,
  });
}
