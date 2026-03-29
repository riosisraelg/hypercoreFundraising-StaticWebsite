# Project Structure

```
.kiro/
  specs/
    gift-draw-platform/     # Spec: design doc, config
      .config.kiro
      design.md
  steering/                 # Workspace-level AI steering rules
    product.md
    tech.md
    structure.md

docs/
  scope-exploration.md      # Requirements exploration (living document)

reportes/
  reporte-sistema-hypercore.tex   # Team report (LaTeX source)
  reporte-sistema-hypercore.pdf   # Compiled PDF

src/                        # Source code (TBD — Django backend + React frontend)
```

## Conventions

- `docs/` — project documentation, scope exploration, requirements
- `reportes/` — team-facing reports (LaTeX)
- `.kiro/specs/` — spec-driven development artifacts
- `.kiro/steering/` — AI assistant context rules
- `src/` — application source code (to be created when development starts)
