---
inclusion: always
---

# Design System Rules — HyperCore Gift Draw Platform

## Frameworks & Libraries
- Frontend: React (SPA)
- Backend: Django + Django REST Framework
- Languages: JavaScript/TypeScript, HTML, CSS, Python

## Styling Approach
- To be defined when scaffolding is created
- When integrating Figma designs, replace Tailwind utility classes from Figma MCP output with the project's chosen styling approach
- Use consistent design tokens for colors, typography, and spacing

## Component Architecture
- Components live in `src/` (to be created)
- Reuse existing components (buttons, inputs, typography) instead of duplicating
- Follow React component conventions: functional components with hooks

## Token Definitions
- Colors, typography scale, and spacing tokens should be defined centrally
- Use CSS custom properties or a theme file for token management
- Maintain 1:1 visual parity with Figma designs; prefer design-system tokens when conflicts arise

## Icon System
- To be defined when project scaffolding is created
- Follow a consistent naming convention for icon files

## Asset Management
- Static assets stored in a dedicated assets directory under `src/`
- Optimize images for web delivery
- Hosting via AWS Amplify

## Figma Integration Guidelines
- Treat Figma MCP output (React + Tailwind) as a representation of design intent, not final code
- Adapt generated code to match the project's styling system and existing components
- Validate final UI against the Figma screenshot for both look and behavior
- Respect existing routing, state management, and data-fetch patterns in the repo
- Use `get_design_context` as the primary tool for design-to-code workflows
- Use Code Connect to link code components to their Figma counterparts

## Project Structure
- `src/` — application source code (Django backend + React frontend)
- `docs/` — project documentation, scope exploration
- `.kiro/steering/` — AI assistant context rules
- `.kiro/specs/` — spec-driven development artifacts
