"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { GlassInputWrapper } from "@/components/ui/auth/GlassInput";
import { motion } from "framer-motion";
import Link from "next/link";
import { signIn } from "next-auth/react";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (result?.error) {
        alert('Authentication failed. Please check your credentials.');
      } else if (result?.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign in error:', error);
      alert('An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <motion.div 
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white">
              Welcome back
            </h1>
            <p className="text-neutral-600 dark:text-neutral-200 text-opacity-100">
              Sign in to your account to continue building with Briki AI
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <fieldset disabled={isLoading}>
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200 text-opacity-100">
                    Email Address
                  </label>
                  <GlassInputWrapper>
                    <input 
                      name="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400" 
                    />
                  </GlassInputWrapper>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200 text-opacity-100">
                    Password
                  </label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input 
                        name="password" 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="••••••••" 
                        className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute inset-y-0 right-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-200 dark:hover:text-neutral-100 transition-colors text-opacity-100" />
                        ) : (
                          <Eye className="w-5 h-5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-200 dark:hover:text-neutral-100 transition-colors text-opacity-100" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="rememberMe" className="rounded border-neutral-300 dark:border-neutral-700 text-[#009BFF]" />
                    <span className="text-neutral-700 dark:text-neutral-200 text-opacity-100">Keep me signed in</span>
                  </label>
                  <Link 
                    href="/reset-password" 
                    className="text-[#009BFF] hover:text-[#0087FF] transition-colors"
                  >
                    Reset password
                  </Link>
                </div>
              </fieldset>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#009BFF] to-cyan-500 py-4 font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-[#0087FF] hover:to-cyan-400 transition-all"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <span className="w-full border-t border-neutral-200 dark:border-neutral-800"></span>
              <span className="px-4 text-sm text-neutral-500 dark:text-neutral-200 bg-white dark:bg-black absolute text-opacity-100">
                Or continue with
              </span>
            </div>

            <button 
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="text-center text-sm text-neutral-600 dark:text-neutral-200 text-opacity-100">
              New to Briki AI?{" "}
              <Link 
                href="/register" 
                className="text-[#009BFF] hover:text-[#0087FF] transition-colors"
              >
                Create Account
              </Link>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Right column: hero image */}
      <section className="hidden md:block flex-1 relative p-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute inset-4 rounded-3xl bg-gradient-to-br from-[#009BFF]/20 to-cyan-500/20 backdrop-blur overflow-hidden"
        >
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <img 
              src="/images/login-hero.png" 
              alt="Briki AI - AI-powered project building"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onError={(e) => {
                // Fallback if image doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </motion.div>
      </section>
    </div>
  );
} 