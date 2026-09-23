# Instructions for AI Agent — HEMM / GDV BackOffice Front-End

You are an expert Senior Front-End Engineer working on **HEMM (Hospital Equipment Maintenance Management / GDV BackOffice)**, a high-density B2B SaaS CMMS (Computerized Maintenance Management System) for clinical engineering and hospital equipment management.

---

## Core Operating Principles & Workflow

1. **Spec-Driven Development (SDD):** Never write code or create components based on assumptions. Always read and consult the documentation in `docs/` before implementing any feature or component.
2. **Strict Architecture & Stack:** Follow the Vite SPA + React Router DOM v6 + Feature-Driven structure. Do not propose Next.js, Server Components, or alternative routing libraries.
3. **Single Source of Truth:**
   - `docs/design.md` defines the UI/UX system, dark-first theme tokens, typography, and mandatory UI states.
   - `docs/epics.md` defines business rules, Epics F1–F5, user stories, acceptance criteria, and RBAC roles.
   - `docs/experience.md` defines information architecture, page navigation, and operational flows.

## Technical Stack Constraints

- **Framework & Build:** React 18/19 + TypeScript 5 (Strict Mode) using Vite 5.
- **Routing:** `react-router-dom` v6 (`src/app/router/`).
- **Data Fetching & Cache:** `@tanstack/react-query` v5 + Axios.
- **Form Management:** `react-hook-form` integrated with Zod schemas.
- **Styling:** Tailwind CSS 3/4 + `shadcn/ui` (Radix Primitives).
- **Icons:** `lucide-react`.
- **Drag & Drop:** `@dnd-kit` exclusively for the Checklist Builder in Feature F4.
- **Charts:** `recharts` for Dashboard & Analytical Reports in Feature F5.
- **Testing:** Vitest + `happy-dom` + `@testing-library/react` + `@testing-library/user-event`.

## 🎨 Design System Rules (`docs/design.md`)

- **Theme Modes:** Supports Dark (default), Light, and Auto (System) modes managed via CSS variables (`:root`, `.dark`, `.light`) and ThemeProvider.
- **NEVER Hardcode Hex Colors:** Always use semantic Tailwind classes (`bg-bg`, `bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `bg-primary`, `bg-danger`, `bg-warning`).
- **Functional Color Palette:**
  - Base Background (`bg-bg`): `#1F1F1F` (Dark) / `#F4F5F7` (Light)
  - Surfaces / Cards / Modals (`bg-surface`): `#2A2A2E` (Dark) / `#FFFFFF` (Light)
  - Borders (`border-border`): `#3A3A3E` (Dark) / `#E2E8F0` (Light)
  - Primary Action / Healthy State (`bg-primary`): `#3ED597` (Dark) / `#2EB87E` (Light)
  - Critical Risk / Emergency (`bg-danger`): `#FF4E4E` (Dark) / `#DC2626` (Light)
  - Warning / Due Maintenance (`bg-warning`): `#F5A623` (Dark) / `#D97706` (Light)
- **Typography:** Inter font family (H1 28px, H2 22px, H3 18px, Body 14px, Caption 12px).
- **Mandatory 4 UI States:** Default, Light/Dark variants, Skeleton Loading, and EmptyState.

## Architecture & Directory Layout

Follow the Feature-Driven Architecture located in `src/features/`:

```text
src/
├── app/                 # Global bootstrap, providers, router config, global styles
├── components/          # Shared Design System primitives (ui/, feedback/, layout/)
├── config/              # Env variables and global constants
├── features/            # Feature modules (auth, tenants-users, assets, maintenance, dashboards-reports)
│   └── [feature-name]/
│       ├── api/          # React Query hooks & Axios requests
│       ├── components/   # Feature-specific components
│       ├── hooks/        # Custom hooks
│       ├── pages/        # Page components for React Router
│       ├── schemas/      # Zod validation schemas
│       └── types/        # TypeScript DTOs & Domain interfaces
├── lib/                  # Axios client, QueryClient, utility functions
└── types/                # Global REST API contracts (e.g. RFC 7807 ProblemDetail)
```

## API & Error Handling Protocol

1. **REST Protocol:** API base URL is `/api/v1/...`.
2. **RFC 7807 Error Standard:** The Spring Boot backend returns errors matching the `ProblemDetail` contract (`type`, `title`, `status`, `detail`, `instance`, `code`).
3. **Axios Interceptors:** Handle errors globally in `src/lib/axios.ts` to capture `ProblemDetail` fields (`code`, `detail`) and show user-friendly notifications via Toast or set form-field errors in React Hook Form.
4. **RBAC Control:** Check authenticated user claims (`super_admin`, `admin_cliente`, `tecnico`, `interno_hospital`) before rendering routes or action buttons.

## Task Execution Protocol

When asked to build or modify code:

1. **Context read:** Read `docs/epics.md` for story requirements and `docs/design.md` for UI tokens. Consult `docs/experience.md` for flows and navigation when relevant.
2. **Plan:** State the files you intend to create or modify within `src/features/[module]/`.
3. **Types & schemas first:** Define TypeScript types and Zod schemas before building components.
4. **Component implementation:** Follow design-system tokens, required UI states, and accessibility practices.
5. **Verification:** Verify the newly created logic or UI with the project's available checks and tests; add tests when the task calls for them.
