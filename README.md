# Briki - AI Insurance Assistant

## PDF Viewer and SSR

### Why We Use Legacy Build + Client Boundary

The PDF viewer in this application is designed to be **strictly client-side** to avoid server-side rendering issues and Node.js dependencies. Here's why and how:

#### **Problem Solved**
- **Canvas Dependency**: `pdfjs-dist` requires Node.js `canvas` package on the server
- **Build Failures**: Vercel builds fail with "Module not found: Can't resolve 'canvas'"
- **Bundle Bloat**: Server bundle includes unnecessary PDF rendering code

#### **Solution Implemented**
1. **Legacy Build**: Uses `pdfjs-dist/legacy/build/pdf` instead of `pdfjs-dist/build/pdf`
   - Legacy build is designed for browser environments
   - No Node.js canvas dependency
   - Smaller bundle size

2. **Client Boundary**: All PDF-related code is contained in client components
   - `PdfInner.tsx` - Contains all PDF.js logic
   - `PdfViewerPane.tsx` - Wrapper component with refs
   - Dynamic imports with `ssr: false` prevent server bundling

3. **Worker Configuration**: PDF worker loads from `/public/pdf.worker.js`
   - Copied during postinstall from `pdfjs-dist`
   - Set via `GlobalWorkerOptions.workerSrc`

#### **File Structure**
```
src/components/assistant/
├── PdfInner.tsx          # All PDF.js logic (client-only)
├── PdfViewerPane.tsx     # Wrapper with refs (client-only)
└── PolicyAnalysisDisplayClient.tsx  # Uses dynamic import
```

#### **Import Chain**
```
/assistant/page.tsx (client) 
  → PolicyAnalysisDisplay (server)
    → PolicyAnalysisDisplayClient (client)
      → PdfViewerPane (dynamic, ssr: false)
        → PdfInner (client, pdfjs-dist/legacy)
```

This approach ensures:
- ✅ **Build Success**: No canvas resolution errors on Vercel
- ✅ **Performance**: PDF code only loads when needed
- ✅ **Reliability**: No SSR-related PDF rendering issues
- ✅ **Maintainability**: Clear separation of concerns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/NicolasDuarte04/Briki-AI-Project-Builder-App-v1-.git
cd Briki-AI-Project-Builder-App-v1-
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                 # App Router directory
│   ├── globals.css     # Global styles with TailwindCSS
│   ├── layout.tsx      # Root layout component
│   └── page.tsx        # Home page component
├── components/         # Reusable components (to be added)
├── lib/               # Utility functions (to be added)
└── types/             # TypeScript type definitions (to be added)
```

## 🎯 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 📝 License

This project is licensed under the MIT License.

<!-- redeploy: 2025-08-08T04:45:19Z -->

## ✅ Deploy checklist (server env only)

Set these env vars in your hosting provider (e.g., Vercel). Do not commit secrets:

Required:
- `RENDER_POSTGRES_URL` – Render Postgres connection string (briki-db)
- `DATABASE_URL` – Same Postgres URL as above
- `OPENAI_API_KEY` – Model key
- `VALIDATE_OPENAI_RESPONSE` – optional; `true`/`false`
- `DIAG_TOKEN` – new diagnostic token (strong random)

Post-deploy verification:
1) Diagnostics endpoint (requires header):
   - GET `/api/diag` with header `x-diag-token: $DIAG_TOKEN`
   - Expect `db.connectable=true`, `insurance_plans_count>0`, `educacion_count>0`, and a small `sample` array
2) Server logs for `/api/ai/chat` should contain:
   - `🔎 prod-check` showing a non-zero `plansReturned`
   - `[plans] after filter` with `kept > 0`

