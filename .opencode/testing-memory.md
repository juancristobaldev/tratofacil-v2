# Testing Memory

- Package manager: npm (`package-lock.json`).
- App: React Native mobile app with Apollo Client GraphQL operations under `src/graphql/operations`.
- Test runner: Jest with React Native preset via `jest.config.js`; setup file is `jest/setup.ts`.
- Useful gates: `npm test`, `npm run lint`, `npm run typecheck`.
- Current high-value tests include payment deep-link regressions under `src/payments/*.test.ts` and route/directions tests under `src/hooks/useRoute.test.tsx` and `src/utils/directions.test.ts`.
- GraphQL contract validation/codegen gate is not configured yet; do not treat component tests that mock domain hooks as frontend-backend integration.
