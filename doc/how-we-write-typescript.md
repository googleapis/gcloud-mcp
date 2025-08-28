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

### Prefer Plain Objects over Classes

Prefer the use of plain JavaScript objects with accompanying TypeScript
interface or type declarations over JavaScript class syntax.

- **Reduced Boilerplate**: Classes often promote the use of constructors, `this`
  binding, getters, setters, and other boilerplate that can unnecessarily bloat
  code.
- **Enhanced Readability**: Plain objects, especially when their structure is
  clearly defined by TypeScript interfaces, are often easier to read and
  understand.
- **Simplified Immutability**: Plain objects encourage an immutable approach to
  data.
- **Better Serialization**: Plain JavaScript objects are naturally easy to
  serialize to JSON and deserialize back.

### Embrace ES Module Syntax for Encapsulation

Leverage ES module syntax (`import`/`export`) for encapsulating private and
public APIs.

- **Clear Public API Definition**: Anything that is exported is part of the
  public API of that module, while anything not exported is inherently private
  to that module.
- **Enhanced Testability**: Unexported functions or variables are not
  accessible from outside the module. This encourages you to test the public API
  of your modules, rather than their internal implementation details.
- **Reduced Coupling**: Explicitly defined module boundaries through
  `import`/`export` help reduce coupling between different parts of your
  codebase. -**Faster Module Loading**: ESM asynchronous module loading allows for parallel
  loading of import modules, as well as tree-shaking, giving our code more
  efficient loading.

## Code Style and Linting

We use [ESLint](https://eslint.org/) for linting and
[Prettier](https://prettier.io/) for code formatting. Presubmit checks will fail
if code is not properly formatted.

Before submitting any changes, it is crucial to validate them by running the
full preflight check. This command will build the repository, run all tests,
check for type errors, and lint the code.

To run the full suite of checks, execute the following command:
`npm run preflight`

## Type Safety

Leverage TypeScript's type system to make your code more robust and
self-documenting.

- **Use specific types**: Avoid `any` whenever possible. Prefer specific types
  like `string`, `number`, or custom interfaces.
- **Use `unknown` for safety**: When dealing with values from external sources
  (e.g., APIs, user input), use `unknown` and perform type checking before use.
- **Keep types close to the code they describe**: Define interfaces and types
  near the functions or classes that use them to improve locality and
  readability.

### Avoid `any` Types and Type Assertions; Prefer `unknown`

Using `any` effectively opts out of TypeScript's type checking for that
particular variable or expression. When you absolutely cannot determine the type
of a value at compile time, and you're tempted to reach for `any`, consider
using `unknown` instead. `unknown` is a type-safe counterpart to `any`.

### Embrace JavaScript's Array Operators

Leverage JavaScript's rich set of array operators as much as possible. Methods
like `.map()`, `.filter()`, `.reduce()`, `.slice()`, `.sort()`, and others are
incredibly powerful for transforming and manipulating data collections in an
immutable and declarative way.

## Writing Tests

We use [Vitest](https://vitest.dev/) for testing. Tests should be clear, concise,
and focused on a single behavior.

Tests should also be focused on outcomes rather than the specific implementation. This
gives testing greater confidence if an implementation is changed, but the outcome
remains the same.

### Naming and Location

- Test files must be located alongside the code they test.
- Test files must be named with a `.test.ts` suffix (e.g., `my-feature.test.ts`).

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

### Mocking (`vi` from Vitest)

- **ES Modules**: Mock with `vi.mock('module-name', async (importOriginal) => { ... })`.
- **Mocking Order**: For critical dependencies (e.g., `os`, `fs`) that affect
  module-level constants, place `vi.mock` at the very top of the test file,
  before other imports.
- **Mock Functions**: Create with `vi.fn()`.
- **Spying**: Use `vi.spyOn(object, 'methodName')`. Restore spies with
  `mockRestore()` in `afterEach`.

## Need Help?

This guide is a living document. If you have questions or suggestions, please
open an issue or start a discussion.
