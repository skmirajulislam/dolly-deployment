# Vercel Deployment Fix Guide

## Issues Identified:

1. **Internal API Call Problem**: The `/api/admin/gallery` route was making internal fetch calls to `/api/upload` using `NEXTAUTH_URL` which caused circular dependency issues in production.

2. **Environment Variable Configuration**: `NEXTAUTH_URL` was set to `localhost:3000` which doesn't work in production.

3. **Cloudinary Configuration**: Missing validation and error handling for Cloudinary environment variables.

## Fixes Applied:

### 1. Fixed Internal API Calls
- **Modified `/app/api/admin/gallery/route.ts`**: Removed internal fetch calls to `/api/upload` and implemented direct Cloudinary upload
- **Modified `/app/api/admin/gallery/[id]/route.ts`**: Replaced internal API deletion with direct Cloudinary calls
- **Updated `/lib/cloudinary-delete.ts`**: Removed dependency on internal API calls

### 2. Enhanced Error Handling
- **Updated `/app/api/upload/route.ts`**: Added Cloudinary configuration validation and better error messages

### 3. Added Vercel Configuration
- **Created `vercel.json`**: Set appropriate timeout for API functions

## Environment Variables Required in Vercel:

Set these environment variables in your Vercel dashboard:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dx7v1e5fj
CLOUDINARY_API_KEY=622322522494898
CLOUDINARY_API_SECRET=WRFQUfb82CTDyYKmtU2GFCzldF0
DATABASE_URL=postgresql://neondb_owner:npg_ItOyxmpB27kw@ep-purple-sunset-a1e4pnfs-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNzA4MzQ1MTIzfQSflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
ADMIN_EMAIL=admin@dollyhotel.com
ADMIN_PASSWORD=admin123
NEXTAUTH_SECRET=Ac1bdGJAOcTDGI+d7qSQGWXYJusV7qM5wLuKd5s
NEXTAUTH_URL=https://dolly-final-nine.vercel.app
```

**IMPORTANT**: Update `NEXTAUTH_URL` to match your actual Vercel deployment URL.

## Deploy Steps:

1. Commit all the changes made to the repository
2. Set the environment variables in Vercel dashboard
3. Trigger a new deployment in Vercel
4. Test the upload functionality

## Testing:

After deployment, test:
1. Image uploads via `/api/upload`
2. Gallery image uploads via admin panel
3. Image deletion functionality

## Key Changes Made:

1. **Removed internal API dependencies** - All Cloudinary operations now use direct SDK calls
2. **Added configuration validation** - Prevents silent failures due to missing env vars
3. **Enhanced error handling** - Better error messages for debugging
4. **Added timeout configuration** - Prevents function timeouts during uploads