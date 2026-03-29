# Project Structure

```
.kiro/
  hooks/                    # Agent hooks
  specs/
    gift-draw-platform/     # Spec: design doc, config
      .config.kiro
      design.md
  steering/                 # Workspace-level AI steering rules
    design-system.md
    product.md
    tech.md
    structure.md

amplify/                    # AWS Amplify Gen 2 backend
  auth/resource.ts          # Cognito auth config
  data/resource.ts          # AppSync + DynamoDB schema
  backend.ts                # Backend entry point

src/                        # React frontend (Vite + TypeScript)
  App.tsx                   # Main app component
  App.css                   # App-level styles
  main.tsx                  # Entry point (Amplify config + React root)
  index.css                 # Global styles
  vite-env.d.ts             # Vite type declarations

docs/
  scope-exploration.md      # Requirements exploration (living document)

docs/reportes/
  reporte-sistema-hypercore.tex   # Team report (LaTeX source)
  reporte-sistema-hypercore.pdf   # Compiled PDF

index.html                  # Vite HTML entry
package.json                # Dependencies & scripts
vite.config.ts              # Vite configuration
tsconfig.json               # TypeScript config
eslint.config.js            # ESLint flat config
```

## Conventions

- `src/` — React frontend source code
- `amplify/` — AWS Amplify Gen 2 backend definitions
- `docs/` — project documentation, scope exploration, requirements
- `docs/reportes/` — team-facing reports (LaTeX)
- `.kiro/specs/` — spec-driven development artifacts
- `.kiro/steering/` — AI assistant context rules
- `.kiro/hooks/` — agent automation hooks
