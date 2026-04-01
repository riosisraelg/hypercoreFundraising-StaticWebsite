# Amplify Client Config Error — Bugfix Design

## Overview

`generateClient()` from `aws-amplify/data` throws "Amplify has not been configured" despite `Amplify.configure(outputs)` being called in `src/main.tsx`. The root cause is that `src/lib/amplify-client.ts` calls `generateClient()` on every invocation of `getDataClient()` instead of caching the result, and the redundant `Amplify.configure()` inside that module creates a timing conflict with Vite's ESM module resolution. The fix replaces the function-based lazy initialization with a module-level singleton client, relying solely on the top-level configure call in `main.tsx`.

## Glossary

- **Bug_Condition (C)**: Any call to `getDataClient()` that internally invokes `generateClient()` when the Amplify singleton configuration is not yet visible in the `aws-amplify/data` sub-package's module scope
- **Property (P)**: `getDataClient()` (or its replacement export) returns a functional, cached Amplify Data client capable of executing GraphQL operations
- **Preservation**: Existing auth mode behavior (userPool for admin, apiKey for public), `amplify_outputs.json` usage, and React initialization must remain unchanged
- **`getDataClient()`**: The function in `src/lib/amplify-client.ts` that wraps `generateClient()` — currently broken due to missing config visibility and lack of caching
- **`Amplify.configure()`**: The singleton configuration call from `aws-amplify` that must run before `generateClient()` can succeed
- **`amplify_outputs.json`**: The Amplify Gen 2 sandbox config file containing `auth` and `data` sections (AppSync URL, API key, Cognito pools, model introspection)

## Bug Details

### Bug Condition

The bug manifests when any page component (HomePage, DashboardPage) calls `getDataClient()`, which internally calls `generateClient()`. The `generateClient()` function invokes `Amplify.getConfig()` to read the singleton state, but the configuration set by `Amplify.configure(outputs)` in `main.tsx` may not be visible due to Vite ESM module execution order. Additionally, calling `generateClient()` on every invocation (no caching) compounds the problem — each call re-checks config state and creates a new client unnecessarily.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { caller: ComponentName, callCount: number }
  OUTPUT: boolean

  // The bug triggers on ANY call to getDataClient() because:
  // 1. generateClient() is called fresh each time (no caching)
  // 2. Amplify singleton config may not be visible in the data sub-package
  RETURN getDataClient() IS CALLED
         AND generateClient() INTERNALLY CALLS Amplify.getConfig()
         AND (Amplify.getConfig().API IS UNDEFINED
              OR Amplify.getConfig().data IS UNDEFINED)
END FUNCTION
```

### Examples

- **HomePage load**: User navigates to `/` → `HomePage` mounts → `useEffect` calls `getDataClient()` → `generateClient()` throws "Amplify has not been configured" → dashboard shows "No se pudieron cargar los datos"
- **DashboardPage load**: Admin navigates to `/admin` → `DashboardPage` mounts → `useEffect` calls `getDataClient()` → same error → admin sees empty state
- **Multiple calls in same component**: `HomePage` calls `getDataClient()` twice (for Tickets and FundraisingExtras) → `generateClient()` is invoked twice, doubling the chance of hitting the config timing issue
- **Redundant configure doesn't help**: The `configured` flag in `amplify-client.ts` gates a second `Amplify.configure(outputs)` call, but this doesn't resolve the issue because the `aws-amplify/data` sub-package may hold a separate reference to the Amplify singleton state

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Admin pages (DashboardPage, ticket management) must continue using Cognito User Pool authorization (the default auth mode) for data operations — no explicit `authMode` override
- Public pages (HomePage) must continue using API Key authorization (`authMode: 'apiKey'` passed explicitly) for read-only data operations
- `amplify_outputs.json` config values (AppSync URL, API key, Cognito User Pool ID, Identity Pool ID) must continue to be used for connecting to the correct backend
- React initialization in `main.tsx` with `BrowserRouter` and `StrictMode` must remain unchanged

**Scope:**
All inputs that do NOT involve the Amplify Data client initialization should be completely unaffected by this fix. This includes:
- React component rendering and routing
- CSS styling and layout
- Backend Django API (completely separate)
- Amplify Auth flows (sign-in, sign-out)
- The `amplify_outputs.json` file itself (no changes needed)

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Vite ESM Module Execution Order**: In Vite's ESM bundling, `src/lib/amplify-client.ts` imports `aws-amplify` and `aws-amplify/data` independently from `src/main.tsx`. When `amplify-client.ts` is imported by a page component, its module-level imports resolve before `main.tsx`'s `Amplify.configure(outputs)` has executed. The `generateClient()` call then sees an unconfigured Amplify singleton.

2. **No Client Caching**: `getDataClient()` calls `generateClient()` on every invocation. Even if the first call somehow succeeds, subsequent calls redundantly create new clients. This is wasteful and increases exposure to the timing bug.

3. **Redundant Configure Creates Confusion**: The `Amplify.configure(outputs)` call inside `getDataClient()` (guarded by a `configured` flag) attempts to fix the problem but doesn't work reliably because:
   - The `aws-amplify/data` sub-package may resolve its own internal reference to the Amplify singleton at import time, before the inline configure runs
   - Having two configure call sites makes the initialization order unpredictable

4. **Sub-package Module Boundary**: `aws-amplify/data` (the `generateClient` export) may internally cache or snapshot the Amplify config at import time rather than reading it lazily. This means configuring Amplify after the `aws-amplify/data` module has been imported may not propagate the config to `generateClient()`.

## Correctness Properties

Property 1: Bug Condition — Client Returns Without Throwing

_For any_ call to the data client accessor (whether from HomePage, DashboardPage, or any other component), the fixed module SHALL return a functional Amplify Data client instance without throwing a configuration error, provided `Amplify.configure(outputs)` has been called once at application startup.

**Validates: Requirements 2.1, 2.3**

Property 2: Preservation — Auth Mode Behavior Unchanged

_For any_ data operation performed through the client, the fixed code SHALL preserve the existing authorization behavior: admin pages use the default Cognito User Pool auth mode, and public pages explicitly pass `authMode: 'apiKey'` for read-only access. The fix SHALL NOT alter how auth modes are selected or passed to client operations.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/lib/amplify-client.ts`

**Function**: `getDataClient()` → replaced with module-level singleton

**Specific Changes**:

1. **Remove redundant `Amplify.configure()`**: Delete the `Amplify` import, the `outputs` import, the `configured` flag, and the inline `Amplify.configure(outputs)` call from `amplify-client.ts`. The sole configure call in `main.tsx` is sufficient.

2. **Call `generateClient()` once at module level**: Replace the `getDataClient()` function with a module-level `const client = generateClient()` that executes once when the module is first imported. Export this `client` constant directly.

3. **Ensure import order**: Since `main.tsx` calls `Amplify.configure(outputs)` before rendering `<App />`, and page components import `amplify-client.ts` only when they render, the configure call is guaranteed to have run before `generateClient()` executes at module level.

4. **Update consumer imports**: Change `HomePage.tsx` and `DashboardPage.tsx` (and any other consumers) from `import { getDataClient } from '../../lib/amplify-client'` + `const client = getDataClient()` to `import { client } from '../../lib/amplify-client'` and use `client` directly.

5. **No changes to `amplify_outputs.json`**: The config file is valid and complete — no modifications needed.

6. **No changes to `main.tsx`**: The existing `Amplify.configure(outputs)` call at the top of `main.tsx` is correct and sufficient.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that mock the Amplify modules and simulate the module execution order. Call `getDataClient()` after configuring Amplify and assert that `generateClient()` is invoked without throwing. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Config Error Test**: Import `getDataClient` and call it — verify it throws the config error on unfixed code (will fail on unfixed code)
2. **Multiple Call Test**: Call `getDataClient()` twice — verify `generateClient()` is called twice instead of once (will fail on unfixed code)
3. **Redundant Configure Test**: Verify that the inline `Amplify.configure()` in `getDataClient()` does not prevent the error (will fail on unfixed code)

**Expected Counterexamples**:
- `generateClient()` throws "Amplify has not been configured" even after inline configure
- `generateClient()` is called N times for N calls to `getDataClient()` (no caching)

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  // After fix: client is a module-level singleton
  result := import { client } from 'amplify-client'
  ASSERT client IS NOT NULL
  ASSERT client.models IS DEFINED
  ASSERT client.models.Ticket IS DEFINED
  ASSERT NO ERROR THROWN
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  // Auth mode selection is unchanged
  ASSERT HomePage STILL PASSES authMode: 'apiKey' TO client operations
  ASSERT DashboardPage STILL USES default auth mode (no explicit authMode)
  ASSERT Amplify.configure(outputs) STILL CALLED EXACTLY ONCE in main.tsx
  ASSERT React renders with BrowserRouter + StrictMode
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It can generate many import/call sequences to verify the singleton always returns the same reference
- It catches edge cases like concurrent imports or re-imports
- It provides strong guarantees that auth mode behavior is unchanged

**Test Plan**: Observe behavior on UNFIXED code first for auth mode usage and React initialization, then write tests capturing that behavior.

**Test Cases**:
1. **Auth Mode Preservation**: Verify HomePage passes `authMode: 'apiKey'` and DashboardPage uses default auth — this should work identically before and after fix
2. **Config Values Preservation**: Verify `amplify_outputs.json` values are passed to `Amplify.configure()` unchanged
3. **React Init Preservation**: Verify `main.tsx` still renders with `StrictMode` and `BrowserRouter`

### Unit Tests

- Test that the exported client is not null/undefined after proper Amplify configuration
- Test that the exported client is a singleton (same reference on multiple imports)
- Test that `generateClient()` is called exactly once (module-level), not on every access
- Test that no `Amplify.configure()` call exists in `amplify-client.ts`

### Property-Based Tests

- Generate random sequences of client access calls and verify all return the same singleton reference
- Generate random component mount orders (HomePage first vs DashboardPage first) and verify client works in all cases
- Verify that for any number of concurrent component mounts, the client is initialized exactly once

### Integration Tests

- Test full page load of HomePage with mocked Amplify backend — verify data fetching succeeds with apiKey auth
- Test full page load of DashboardPage with mocked Amplify backend — verify data fetching succeeds with default userPool auth
- Test navigation between public and admin pages — verify client works across route transitions
