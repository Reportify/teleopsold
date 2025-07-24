Teleops UI Theme Brief for Development Team
📘 Objective
Maintain a modern, professional, and minimalist UI theme for Teleops with a centralized, scalable approach to easily update and manage the theme across the product (including support for light and dark modes).

1. Centralized Theme Configuration
   Create a single theme.ts or theme.js file to define all theme variables (colors, typography, spacing, shadows, etc.).
   // theme.ts
   export const theme = {
   colors: {
   primary: "#1F5EFF",
   secondary: "#A0AEC0",
   background: "#F5F7FA",
   surface: "#FFFFFF",
   success: "#2BC48A",
   error: "#FF5C5C",
   warning: "#FFCC00",
   textPrimary: "#1A1D23",
   textSecondary: "#5A6572",
   },
   typography: {
   fontFamily: "'Inter', sans-serif",
   heading: "600",
   body: "400",
   mono: "'JetBrains Mono', monospace",
   },
   borderRadius: "12px",
   shadow: "0 1px 4px rgba(0,0,0,0.06)",
   };
2. Use CSS Variables or Design Tokens
   Create a variables.css file or root token system to allow easier switching between themes and consistent usage.
   :root {
   --color-primary: #1F5EFF;
   --color-error: #FF5C5C;
   --font-base: 'Inter', sans-serif;
   --radius: 12px;
   --shadow: 0 1px 4px rgba(0,0,0,0.06);
   }

.dark {
--color-primary: #5A80FF;
--background: #121417;
--text: #F5F5F5;
} 3. Tailwind (if used)
Update tailwind.config.js to define these theme values centrally.
theme: {
extend: {
colors: {
primary: '#1F5EFF',
background: '#F5F7FA',
surface: '#FFFFFF',
error: '#FF5C5C',
},
fontFamily: {
sans: ['Inter', 'sans-serif'],
mono: ['JetBrains Mono', 'monospace'],
},
borderRadius: {
md: '12px',
},
},
} 4. Component Design Guidelines

- All components must use the theme or token values (no hardcoding of styles).
- Maintain consistent spacing using 4px scale (4, 8, 16, 24, etc.).
- Components must support both light and dark themes.
- Ensure buttons, alerts, cards, modals use consistent radius and shadows.

5. Dark Mode Support
Use class-based dark mode switching.
<html class="dark">
Use CSS variables or Tailwind's dark: prefix to style for dark mode.
6. Suggested Directory Structure
   /src
   /styles
   theme.ts
   variables.css
   tailwind.config.js
   /components
   Button.tsx
   Card.tsx
   Modal.tsx
   /themes
   light.ts
   dark.ts
7. Theme Update Process
8. Update theme.ts or variables.css
9. Test across components and screen sizes
10. Check dark/light mode appearance
11. Run visual regression tests (if available)
12. Commit with clear changelog message
    Example: chore(theme): update primary and background colors
13. Inform QA for validation
14. Best Practices

- Stick to minimalist design — clean layout, no clutter
- Avoid overuse of shadows, gradients, or excessive color
- Use outline icons (Lucide, Heroicons) with consistent stroke width
- Keep typography consistent using Inter for body and JetBrains Mono for data/numbers
