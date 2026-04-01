# Tasks — Amplify Client Config Error Bugfix

- [x] 1. Refactor `src/lib/amplify-client.ts` to use module-level singleton
  - [x] 1.1 Remove redundant `Amplify` import, `outputs` import, `configured` flag, and inline `Amplify.configure()` call
  - [x] 1.2 Replace `getDataClient()` function with module-level `const client = generateClient()` and export it
- [x] 2. Update consumer components to use the new export
  - [x] 2.1 Update `src/pages/public/HomePage.tsx` — replace `getDataClient()` calls with imported `client`
  - [x] 2.2 Update `src/pages/admin/DashboardPage.tsx` — replace `getDataClient()` calls with imported `client`
  - [x] 2.3 Update `src/pages/public/ResultsPage.tsx` — replace `getDataClient()` calls with imported `client`
  - [x] 2.4 Search for and update any other files that import `getDataClient`
- [x] 3. Verify `src/main.tsx` is unchanged (single `Amplify.configure(outputs)` call remains)
- [x] 4. Write tests
  - [x] 4.1 Unit test: exported `client` is defined and has expected shape (`client.models.Ticket`, etc.)
  - [x] 4.2 Unit test: `generateClient()` is called exactly once (module-level singleton)
  - [x] 4.3 Preservation test: HomePage still passes `authMode: 'apiKey'` for public reads
  - [x] 4.4 Preservation test: DashboardPage uses default auth mode (no explicit `authMode`)
  - [x] 4.5 [PBT-exploration] Property 1: Bug Condition — verify `getDataClient()` throws config error on unfixed code
  - [x] 4.6 [PBT-fix] Property 1: Bug Condition — verify fixed client returns without throwing for any call sequence
  - [x] 4.7 [PBT-preservation] Property 2: Preservation — verify singleton reference equality across any number of imports
