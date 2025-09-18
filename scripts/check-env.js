require("dotenv").config({ path: ".env.local" }); // load local secrets first
require("dotenv").config();                      // then load .env if present
require("dotenv").config({ path: ".env.local" }); // load local secrets first
require("dotenv").config();                      // then load .env if present
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[env-check] Missing: ${missing.join(", ")}`);
  process.exit(1);
}
console.log("[env-check] OK");


