# How We Write TypeScript

This guide provides conventions for writing readable, idiomatic, and testable
TypeScript code in this codebase.

It covers our primary tools, patterns, and standards to help you contribute
high-quality code in every pull request.

## Guiding Principles

We follow standard TypeScript best practices, with a focus on simplicity,
readability, and type safety. When in doubt, refer to the official
[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
and existing code in this repository.

Key resources include:
- [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [The TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Google's TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

## Code Style and Linting

We use [ESLint](https://eslint.org/) for linting and
[Prettier](https://prettier.io/) for code formatting. Presubmit checks will fail
if code is not properly formatted.

To format your code before committing, run:
`npm run format`

To check for lint errors, run:
`npm run lint`

## Writing Tests

We use [Vitest](https://vitest.dev/) for testing. Tests should be clear, concise,
and focused on a single behavior.

### Naming and Location

- Test files must be located alongside the code they test.
- Test files must be named with a `.test.ts` suffix (e.g., `my-feature.test.ts`).

### Assertions

Use `expect` with matchers from Vitest's built-in `expect` API for assertions.
Prefer semantic matchers like `toBe`, `toEqual`, and `toThrow` to make test
intent clear.

Example:
```typescript
import { expect, test } from 'vitest';
import { greet } from './greet';

test('greet returns a personalized greeting', () => {
  expect(greet('Alice')).toBe('Hello, Alice!');
});
```

### Test Structure

Use `describe` to group related tests and `test` (or `it`) for individual test
cases. This improves organization and reporting.

Example:
```typescript
import { describe, expect, test } from 'vitest';
import { Calculator } from './calculator';

describe('Calculator', () => {
  test('adds two numbers', () => {
    const calc = new Calculator();
    expect(calc.add(2, 3)).toBe(5);
  });

  test('subtracts two numbers', () => {
    const calc = new Calculator();
    expect(calc.subtract(5, 3)).toBe(2);
  });
});
```

## Type Safety

Leverage TypeScript's type system to make your code more robust and self-documenting.

- **Use specific types**: Avoid `any` whenever possible. Prefer specific types
  like `string`, `number`, or custom interfaces.
- **Use `unknown` for safety**: When dealing with values from external sources
  (e.g., APIs, user input), use `unknown` and perform type checking before use.
- **Keep types close to the code they describe**: Define interfaces and types
  near the functions or classes that use them to improve locality and readability.

## Need Help?

This guide is a living document. If you have questions or suggestions, please
open an issue or start a discussion.
