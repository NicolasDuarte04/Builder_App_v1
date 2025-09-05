-- Migration: Add membership tier support to users table
-- Date: 2024-12-19
-- Purpose: Enable premium subscription features and policy limits

-- Add membership tier column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(20) DEFAULT 'free' CHECK (membership_tier IN ('free', 'premium')),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS premium_active_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster membership queries
CREATE INDEX IF NOT EXISTS idx_users_membership_tier ON users(membership_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Add comment for documentation
COMMENT ON COLUMN users.membership_tier IS 'User subscription tier: free or premium';
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for subscription management';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status';
COMMENT ON COLUMN users.subscription_end_date IS 'When the current subscription expires';
COMMENT ON COLUMN users.premium_active_at IS 'When premium subscription became active';
COMMENT ON COLUMN users.premium_expires_at IS 'When premium subscription expires';

-- Update existing users to have free tier
UPDATE users SET membership_tier = 'free' WHERE membership_tier IS NULL;
