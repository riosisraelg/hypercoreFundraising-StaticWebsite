# Bugfix Requirements Document

## Introduction

`generateClient()` from `aws-amplify/data` throws "Client could not be generated. This is likely due to `Amplify.configure()` not being called prior to `generateClient()`" even though `Amplify.configure(outputs)` is called at the top level of `src/main.tsx` before the app renders. A redundant `Amplify.configure(outputs)` call also exists in `src/lib/amplify-client.ts`. The backend API works correctly via curl, confirming the issue is purely in the frontend client initialization. This blocks all data fetching on both public (HomePage) and admin (DashboardPage) pages.

The root cause is that `getDataClient()` in `src/lib/amplify-client.ts` calls `generateClient()` on every invocation rather than caching the client instance, and the `generateClient()` call internally invokes `Amplify.getConfig()` which may not see the configuration due to Vite's ESM module execution order — the Amplify singleton state set by `Amplify.configure()` in `main.tsx` may not be visible when `amplify-client.ts` resolves its own import of `aws-amplify`, or the redundant configure call creates a timing conflict. The `amplify_outputs.json` structure is valid (contains `data.url`, `data.api_key`, `data.model_introspection`, and `auth` sections).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `getDataClient()` is called from any page component (e.g., HomePage, DashboardPage) THEN the system throws "Client could not be generated. This is likely due to `Amplify.configure()` not being called prior to `generateClient()` or because the configuration passed to `Amplify.configure()` is missing GraphQL provider configuration."

1.2 WHEN `getDataClient()` is called multiple times across different components THEN the system creates a new `generateClient()` call each time instead of reusing a cached client instance, compounding the configuration detection failure.

1.3 WHEN `Amplify.configure(outputs)` is called redundantly in both `src/main.tsx` (top-level) and `src/lib/amplify-client.ts` (inline before `generateClient()`) THEN the system still fails to detect the configuration when `generateClient()` runs, indicating the configure call inside `amplify-client.ts` does not reliably make the config visible to the `aws-amplify/data` sub-package.

### Expected Behavior (Correct)

2.1 WHEN `getDataClient()` is called from any page component THEN the system SHALL return a functional Amplify Data client that can successfully execute GraphQL operations (list, get, create, update, delete) against the AppSync API.

2.2 WHEN `getDataClient()` is called multiple times across different components THEN the system SHALL return the same cached client instance rather than calling `generateClient()` repeatedly.

2.3 WHEN `Amplify.configure(outputs)` is called once at application startup (in `src/main.tsx`) THEN the system SHALL ensure that configuration is visible to all subsequent `generateClient()` calls without requiring redundant inline configure calls in other modules.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an authenticated admin user accesses admin pages (DashboardPage, ticket management) THEN the system SHALL CONTINUE TO use Cognito User Pool authorization (the default auth mode) for data operations.

3.2 WHEN an unauthenticated user accesses the public HomePage THEN the system SHALL CONTINUE TO use API Key authorization (`authMode: 'apiKey'`) for read-only data operations.

3.3 WHEN `amplify_outputs.json` contains valid `auth` and `data` configuration sections THEN the system SHALL CONTINUE TO use those configuration values for connecting to the correct AppSync endpoint, Cognito User Pool, and Identity Pool.

3.4 WHEN the application renders THEN the system SHALL CONTINUE TO initialize React with BrowserRouter and StrictMode as configured in `src/main.tsx`.
