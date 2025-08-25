# 🚀 Production Environment Setup Guide

## **Critical: Set These Environment Variables in Vercel**

### **1. NextAuth Configuration (REQUIRED)**

```env
# Primary domain - MUST match exactly
NEXTAUTH_URL=https://www.brikiapp.com

# Secret key - MUST be set and consistent
NEXTAUTH_SECRET=your-strong-secret-key-here

# NextAuth v5 compatibility
AUTH_TRUST_HOST=true
```

### **2. Domain Configuration (REQUIRED)**

```env
# Canonical domain for the application
NEXT_PUBLIC_CANONICAL_DOMAIN=https://www.brikiapp.com

# Base URL for client-side requests
NEXT_PUBLIC_BASE_URL=https://www.brikiapp.com
```

### **3. OAuth Configuration (REQUIRED)**

```env
# Google OAuth (must include www.brikiapp.com in redirect URIs)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### **4. Supabase Configuration (REQUIRED)**

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## **🔧 How to Set in Vercel**

1. **Go to**: Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Environment**: Select "Production" (and Preview if needed)
3. **Add each variable** with the exact names and values above
4. **Redeploy** after setting all variables

## **🌐 Domain Configuration in Vercel**

### **1. Verify Domain Ownership**
- **Go to**: Vercel Dashboard → Your Project → Settings → Domains
- **Confirm**: Both domains are attached to THIS project:
  - `www.brikiapp.com` (primary)
  - `brikiapp.com` (apex, redirects to www)

### **2. Remove from Other Projects**
- **Check**: No other Vercel project should own these domains
- **Remove**: If found in other projects, remove them there first

## **📋 DNS Configuration**

### **Required DNS Records**

```dns
# Apex domain
brikiapp.com → A → 76.76.21.21

# WWW subdomain  
www.brikiapp.com → CNAME → cname.vercel-dns.com
```

### **Remove Old Proxies**
- **Cloudflare**: Disable proxy (orange cloud → gray cloud)
- **Other CDNs**: Remove any old proxy configurations

## **🧪 Testing After Setup**

### **1. Build Verification**
```bash
# Should succeed without canvas errors
npm run build
```

### **2. Domain Testing**
- **Apex**: `https://brikiapp.com/assistant` → should redirect to `https://www.brikiapp.com/assistant`
- **WWW**: `https://www.brikiapp.com/assistant` → should load normally

### **3. Asset Verification**
- **Check**: `https://www.brikiapp.com/_next/static/BUILD_ID` exists
- **Compare**: Should match `https://your-project.vercel.app/_next/static/BUILD_ID`

### **4. Auth Testing**
- **Session**: `/api/auth/session` should return 200 (not CORS error)
- **Cookies**: Should be set for `.brikiapp.com` domain

## **🚨 Common Issues & Solutions**

### **Issue: "Module not found: Can't resolve 'canvas'"**
**Solution**: ✅ Already fixed - PDF viewer uses legacy build + client-only imports

### **Issue: ChunkLoadError for old chunk IDs**
**Solution**: 
1. Set environment variables above
2. Redeploy from main branch
3. Visit `/__sw-reset` to clear stale service workers

### **Issue: NextAuth CORS errors**
**Solution**:
1. Verify `NEXTAUTH_URL=https://www.brikiapp.com` exactly
2. Check domain binding in Vercel
3. Ensure cookies use `.brikiapp.com` domain

### **Issue: Domain redirects not working**
**Solution**:
1. Verify both domains attached to this project
2. Check DNS records match Vercel requirements
3. Remove from other Vercel projects

## **📱 Post-Setup Checklist**

- [ ] All environment variables set in Vercel Production
- [ ] Both domains attached to this project only
- [ ] DNS records configured correctly
- [ ] Old proxies/CDNs removed
- [ ] Fresh deployment triggered from main branch
- [ ] `/assistant` loads without ChunkLoadError
- [ ] Auth session works on www.brikiapp.com
- [ ] Apex domain redirects to www

## **🆘 Emergency Reset**

If things go wrong:
1. **Visit**: `/__sw-reset` to clear service workers
2. **Hard refresh**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
3. **Clear cookies**: For brikiapp.com domain
4. **Check Vercel logs**: For deployment errors

---

**Remember**: After setting environment variables, you MUST redeploy for changes to take effect!
