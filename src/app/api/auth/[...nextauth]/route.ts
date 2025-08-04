import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { type NextAuthOptions } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Create Supabase client for user management
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("Authorize called with email:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
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
            console.log("User not found:", error);
            return null;
          }
          
          console.log("User found:", user.email);

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          
          if (!isPasswordValid) {
            console.log("Invalid password for user:", user.email);
            return null;
          }

          console.log("Password valid, returning user");
          
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

            console.log("Created new user:", newUser);
          } else {
            console.log("User already exists:", existingUser);
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
      console.log("JWT callback - user:", user, "account:", account?.provider);
      
      // When user signs in, store their database ID
      if (user && account) {
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
      
      console.log("JWT token after update:", token);
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Handle Vercel preview URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 