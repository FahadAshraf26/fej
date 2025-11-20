# Flapjack Next.js Application

## Overview
This is a Next.js 12 application for restaurant menu design and management with PSD import functionality, Stripe payments, and Supabase authentication.

## Recent Changes (November 20, 2025)
### Multiple PSD Import with Reordering (Latest)
- **New Feature**: Implemented multiple PSD import where each PSD becomes a separate page in the menu
- **Drag-and-Drop Reordering**: Added ReorderablePSDList component using react-beautiful-dnd for intuitive page ordering
- **Two-Step Workflow**: 
  1. Upload/select multiple PSD files and arrange them in desired order
  2. Click "Create Menu" to process files and create multi-page menu
- **Order Preservation**: Files are processed and pages created in the exact order specified by user
- **Components Updated**: 
  - `components/PSDImport/ReorderablePSDList.tsx` - New drag-and-drop reorderable file list
  - `components/PSDImport/PSDImportZone.tsx` - Rewritten to support two-step workflow with reordering
  - `components/PSDImport/PSDProcessor.tsx` - Already maintains input order through merge process

### Vercel to Replit Migration Completed
- **Port Configuration**: Updated dev and start scripts to bind to 0.0.0.0:5000 for Replit compatibility
- **Security Fixes**: Moved sensitive environment variables (Stripe, Twilio, Supabase secrets) from public `env` block to server-only `serverRuntimeConfig`
- **Next.js Compatibility**: Removed Next.js 13+ specific config options (experimental.serverComponentsExternalPackages, root-level api config)
- **Large File Support**: Added bodyParser config (900mb limit) to PSD import API route (pages/api/import/process-menu.ts)
- **Sentry**: Temporarily disabled instrumentation.ts (can be re-enabled by uncommenting and setting SENTRY_DSN)
- **Node.js**: Upgraded to Node.js 22 using Replit modules

## Project Architecture
### Key Technologies
- **Frontend**: Next.js 12, React 18, Mantine UI
- **Backend**: Next.js API routes, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **File Storage**: Supabase Storage with TUS resumable uploads
- **Design Engine**: Creative Engine SDK (@cesdk/cesdk-js)
- **PSD Processing**: @imgly/psd-importer

### Core Features
1. **Multiple PSD Import with Reordering**: Upload multiple PSD files, drag-and-drop to reorder, and create multi-page menus where each PSD becomes a separate page in the order you specify
2. **PSD Processing**: Process and import Adobe Photoshop files into editable templates using @imgly/psd-importer
3. **Template Management**: Create, edit, and manage restaurant menu templates
4. **Authentication**: Supabase-based user authentication
5. **Subscription Management**: Stripe integration for billing
6. **Image Optimization**: Tinify API for image compression

## Configuration

### Required Environment Variables
The application requires these secrets to function (currently missing):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase public key
- `SUPABASE_SECRET_KEY` - Supabase service role key
- `NEXT_PUBLIC_STRIPE_SECRET_KEY` - Stripe secret key (server-side only via serverRuntimeConfig)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe server secret
- `PRODUCT_PRICE_ID` - Stripe product price ID
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILLO_PHONE` - Twilio SMS credentials
- `TINIFY_API_KEY` - Image compression API key
- `REACT_APP_LICENSE` - Creative Engine SDK license (client-safe)
- `ENCRYPTION_KEY` - Server-side encryption key

### Optional Services
- `NEXT_PUBLIC_GOOGLE_FONTS_API_KEY` - Google Fonts API
- `NEXT_PUBLIC_SLACK_BOT_TOKEN`, `SLACK_NOTIFICATION_CHANNEL_ID` - Slack notifications
- `PIPEDRIVE_API_TOKEN`, `PIPEDRIVE_WEBHOOK_SECRET` - CRM integration
- `SENTRY_DSN` - Error tracking
- `SITE_DOMAIN`, `NEXT_PUBLIC_BASE_URL` - Domain configuration

### Security Notes
- Sensitive credentials are stored in `serverRuntimeConfig` and NOT exposed to the client
- Only `REACT_APP_LICENSE` is exposed client-side as it's required for the Creative Engine SDK
- Never commit secrets to the repository

## Development
```bash
npm run dev        # Start dev server on port 5000
npm run build      # Build for production
npm run start      # Start production server on port 5000
npm run lint       # Run ESLint
```

## Deployment
The application is configured for Replit Autoscale deployment:
- Build: `npm run build`
- Start: `npm run start`
- Port: 5000

## Known Issues
- Next.js lockfile patching warnings (non-critical, uses WASM build)
- TypeScript warnings with react-beautiful-dnd types (cosmetic only, does not affect functionality)
- Application requires environment variables to be configured before full functionality
