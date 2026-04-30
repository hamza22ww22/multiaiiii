# AI_RULES.md

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom CSS utilities (classes like `.font-display`, `.glass`, `.glow-ring`, etc.)
- **UI Components**: shadcn/ui (Radix UI-based, already installed)
- **Routing**: React Router v6
- **Data Fetching**: TanStack React Query
- **Backend**: Supabase (Edge Functions + Database)
- **3D Graphics**: Three.js via @react-three/fiber + @react-three/drei
- **Icons**: Lucide React exclusively
- **Form Handling**: React Hook Form + Zod + @hookform/resolvers
- **Notifications**: Sonner (toast library)
- **Animations/FX**: Custom hooks (`use-tilt.ts`, `use-reveal.ts`) + react-three/fiber for 3D
- **Charts**: Recharts

---

## Library Usage Rules

### UI Components
- **Use shadcn/ui components** from `src/components/ui/` — these are pre-built, accessible, and styled
- **Do NOT install new UI libraries** (e.g., Material UI, Chakra UI) — shadcn/ui + Tailwind covers all cases
- **Create new UI components** in `src/components/ui/` using the existing pattern

### Icons
- **Use Lucide React only** — import from `lucide-react`
- **Do NOT use** emoji, Font Awesome, or other icon libraries
- Import specific icons: `import { Sparkles, ArrowRight } from "lucide-react"`

### Styling
- **Use Tailwind CSS classes** for all component styling
- **Use custom utility classes** from `src/index.css` when appropriate:
  - `.font-display` — Space Grotesk font
  - `.font-mono` — JetBrains Mono font
  - `.glass` — frosted glass effect
  - `.glow-ring` — glowing card effect
  - `.gradient-text` — gradient text effect
  - `.text-stroke` — text outline effect
  - `.noise` — grain texture overlay
  - `.grid-bg` — animated grid background
  - `.link-underline` — animated underline links
  - `.hover-lift` — lift on hover effect
  - Animation classes: `.float`, `.float-slow`, `.shimmer`, `.marquee`, `.pulse-ring`, `.blink`, `.reveal-up`, `.fade-in-slow`

### Forms
- **Use React Hook Form** for form state management
- **Use Zod** for schema validation
- **Use @hookform/resolvers** to connect Zod with React Hook Form
- **Do NOT use** uncontrolled forms with uncontrolled inputs alone

### Data Fetching
- **Use TanStack Query** (`@tanstack/react-query`) for all server state
- **Use Supabase client** from `@/integrations/supabase/client` for database operations
- Keep API calls in dedicated hooks or utility files

### 3D/Animation
- **Use @react-three/fiber + @react-three/drei** for 3D scenes
- **Use custom hooks** (`use-tilt.ts`, `use-reveal.ts`) for 2D effects
- **Do NOT install GSAP, Framer Motion, or other animation libraries** — custom CSS + hooks are sufficient

### Charts
- **Use Recharts** for data visualization
- **Do NOT install** Chart.js, D3, or other charting libraries

### Routing
- **Use React Router v6** exclusively
- Define routes in `src/App.tsx` using the existing pattern
- **Do NOT use** Next.js routing or other routing solutions

### Carousels/Sliders
- **Use embla-carousel-react** — already installed
- **Do NOT install** Swiper.js or other carousel libraries

### Toasts/Notifications
- **Use Sonner** — already integrated in `App.tsx`
- Import: `import { toast } from "sonner"`
- **Do NOT install** react-toastify or other toast libraries

### Date Handling
- **Use date-fns** for date manipulation and formatting
- **Do NOT use** moment.js or dayjs

### State Management
- **Prefer local state** (`useState`, `useReducer`) for component-level state
- **Use TanStack Query** for server state
- **Use React Context** sparingly for truly global state (theme, auth)
- **Do NOT install Redux, Zustand, or Jotai** unless specifically requested

---

## File Structure Conventions

- **Pages**: `src/pages/` — route-level components
- **Components**: `src/components/` — reusable UI components
  - `src/components/ui/` — shadcn/ui components (do not edit, extend via new files)
  - `src/components/fx/` — animation/3D effect wrapper components
- **Hooks**: `src/hooks/` — custom React hooks
- **Lib/Utils**: `src/lib/utils.ts` — utility functions (use `cn()` for class merging)
- **Integrations**: `src/integrations/` — Supabase and other third-party setup

---

## Import Conventions

- Use the `@/` alias for imports: `import { Button } from "@/components/ui/button"`
- Third-party imports go on top, then blank line, then local imports
- Group imports logically within files

---

## Code Style

- **Use `forwardRef`** for components that need ref forwarding
- **Display name**: Always set `ComponentName.displayName = "ComponentName"`
- **TypeScript**: Strict typing — avoid `any`, use proper interfaces/types
- **SSR**: Mark client components with `"use client"` directive at the top