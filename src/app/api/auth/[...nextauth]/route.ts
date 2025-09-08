import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { type NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";

// Safe environment checks
const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!hasSupabase) return null;
  try {
    // Require inside to avoid module-scope throws if env broken
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[auth] Supabase init failed:', err);
    }
    return null;
  }
}

const hasGoogle =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') console.log('[auth]', ...args);
};

export const authOptions: NextAuthOptions = {
  providers: [
    // Include Google only when both secrets exist
    ...(hasGoogle
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : (devLog('Google provider disabled: missing env'), [])),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        devLog("Authorize called with email:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          devLog("Missing credentials");
          return null;
        }
        
        const supabase = getSupabaseAdmin();
        if (!supabase) {
          devLog('Credentials authorize without Supabase — returning null (unauth).');
          return null;
        }
        
        try {
          // Check if user exists in database
          const { data: user, error } = await supabase
            .from("users")
            .select("id, email, name, password")
            .eq("email", credentials.email)
            .single();
          
          if (error || !user) {
            devLog("User not found:", error);
            return null;
          }
          
          devLog("User found:", user.email);

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          
          if (!isPasswordValid) {
            devLog("Invalid password for user:", user.email);
            return null;
          }

          devLog("Password valid, returning user");
          
          // Return user object (without password)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        devLog('signIn: Supabase unavailable — skipping DB ops.');
        return true; // Don't block sign-in flow
      }
      
      if (account?.provider === "google" && profile) {
        try {
          // Check if user exists
          const { data: existingUser } = await supabase
            .from("users")
            .select("id, email, name")
            .eq("email", user.email)
            .single();

          if (!existingUser) {
            // Create new user
            const { data: newUser, error } = await supabase
              .from("users")
              .insert({
                email: user.email,
                name: user.name || "Google User",
                password: "oauth_user", // Placeholder for OAuth users
              })
              .select()
              .single();

            if (error) {
              console.error("Error creating user:", error);
              return false;
            }

            devLog("Created new user:", newUser);
          } else {
            devLog("User already exists:", existingUser);
          }
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        // Use the stored database user ID from the token
        session.user.id = token.userId as string || token.sub!;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      devLog("JWT callback - user:", user, "account:", account?.provider);
      
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        devLog('jwt: Supabase unavailable — passthrough token.');
        return token;
      }
      
      // When user signs in, store their database ID
      if (user && account && user.email) {
        try {
          // Fetch the actual database user ID
          const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", user.email)
            .single();
          
          if (dbUser) {
            token.userId = dbUser.id; // Store the actual database ID
            token.email = user.email;
            token.name = user.name;
          }
        } catch (error) {
          console.error("Error fetching user ID in JWT callback:", error);
        }
      }
      
      devLog("JWT token after update:", token);
      return token;
    },
    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return url;
      } catch (e) {
        devLog('redirect: bad url:', url, e);
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  // @ts-ignore - trustHost is a valid option but not in type definition
  trustHost: true, // Allow localhost and preview URLs
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 