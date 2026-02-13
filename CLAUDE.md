# Fazole — Bean Collecting App

## Tech Stack

- **Frontend:** Vite, React, TypeScript, Mantine UI 8.x, React Router, react-hook-form
- **Backend/Auth:** Firestore, Cloud Functions, Firebase Storage, Google Auth only
- **Workspace:** Turborepo monorepo — apps: `web`, `firebase-functions`; packages: `common` (shared types, constants,
  validation), `config` (common constants, config)

## Skills

- use the `context7` MCP extensively when implementing 3rd party integrations. Always use latest version documentation.
- use the `refactor-ts` skill after each plan task is completed, apply recommended refactorings immediately and rerun
  tests

## Coding Style

### General

- Clean Code pragmatically — prioritize readability over dogma
- Functional patterns over for loops; use lodash (individual imports) where it saves code
- Functions ~20 lines; split if longer but don't be extreme
- Place called routines AFTER calling routines
- Explicit types/interfaces, always specify return types
- Follow turborepo conventions for package structure and npm dependencies
- Coupling and testability:
  - keep coupling concentrated
  - testable code should be extracted to `lib/` and unit tested

### Comments

- Never comment obvious code; no function/method JSDoc
- Use comments for visual hierarchy or genuinely hard-to-understand logic

### React Components

- Classic `function` syntax (not arrow functions) for components and hooks
- Return type always specified (`ReactElement` or `ReactElement | null`)
- Props interface named `<ComponentName>Props`, export only when reused
- One component per file; keep under 100-200 lines
- Arrow functions fine for callbacks and short inline functions

```tsx
interface MyComponentProps {
  prop1: string;
}

export function MyComponent({ prop1 }: MyComponentProps): ReactElement {
  return <Box>{prop1}</Box>;
}
```

### Styling

- Stock Mantine look and feel — no custom theme needed
- Use Mantine component props for styling; SimpleGrid/Flex/Stack/Group for layout
- Avoid custom CSS; if needed, use CSS modules per component
- Don't over-wrap with Paper/Card — keep it simple

## Testing

- Skip testing for simple components with no logic
- Unit tests for: complex components, hooks, library functions, classes
- Skip integration and e2e testing, overkill for project this size
- Don't test highly coupled chokepoints that only work as a facade for 3rd party API, avoid mocking

## Documentation

- When editing a specific typescript file, use `documentor` skill to update its doc block
- Documentation in `docs/` will be updated explicitly when asked (also with `documentor` skill)
