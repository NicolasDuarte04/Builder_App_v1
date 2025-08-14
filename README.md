# Briki-AI-Project-Builder-App-v1-

A simple, beautiful AI-powered app to turn your ideas into actionable project maps.

## 🚀 Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **TailwindCSS** - Utility-first CSS framework
- **ESLint** - Code linting and formatting

## 🛠️ Getting Started

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

