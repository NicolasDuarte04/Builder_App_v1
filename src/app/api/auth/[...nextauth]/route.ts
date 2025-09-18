import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { type NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase-server";

// @ts-expect-error - Next.js route exports
export const runtime = "nodejs";
// @ts-expect-error
export const dynamic = "force-dynamic";

// Google provider env is validated via requireEnv below

const devLog = (...args: any[]) => {
  if (env.server.NODE_ENV !== 'production') console.log('[auth]', ...args);
};

// Fail-fast helper for provider envs
const requireEnv = (keys: string[]) => {
  const missing = keys.filter(k => !(env.server as any)[k]);
  if (missing.length) throw new Error(`[auth] Missing provider env: ${missing.join(", ")}`);
};

// Ensure Google provider env is present if the provider is configured in code
requireEnv(["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"]);

export const authOptions: NextAuthOptions = {
  providers: [
    // Require Google env; fail clearly rather than hiding the provider
    GoogleProvider({
      clientId: env.server.GOOGLE_CLIENT_ID as string,
      clientSecret: env.server.GOOGLE_CLIENT_SECRET as string,
    }),
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
        
        const supabase = supabaseAdmin;
        
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
      const supabase = supabaseAdmin;
      
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
                password: "oauth_user",
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
        session.user.id = (token as any).userId as string || token.sub!;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      devLog("JWT callback - user:", user, "account:", account?.provider);
      
      const supabase = supabaseAdmin;
      
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
            (token as any).userId = dbUser.id;
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
  debug: env.server.NODE_ENV === "development",
  secret: env.server.NEXTAUTH_SECRET,
  // @ts-ignore - trustHost is a valid option but not in type definition
  trustHost: true,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 