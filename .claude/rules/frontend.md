# Frontend Development Rules

## UI/UX Guidelines
- **Color Palette**: Use `ir-blue` (#003366), `gov-saffron` (#FF9933), `gov-green` (#138808) as primary branding.
- **Modern Aesthetic**: Use `rounded-xl`, subtle gradients, and glassmorphism (backdrop-blur) for modern Gov 2.0 feel.
- **Accessibility**: All interactive elements must have `aria-label`. Use `uiStore` for High Contrast and font scaling.
- **Responsiveness**: Ensure the dashboard is fully responsive using Tailwind breakpoints (`md:`, `lg:`).

## Component Structure
- Keep components modular in `/frontend/src/components/ui/`.
- Use Lucide-react for icons consistently.
- Complex charts should use `Recharts`.

## Types
- Use strict TypeScript typing.
- Always update `/frontend/src/types/` if backend models change.
