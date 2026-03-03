# Testing in BackupDR MCP

This document explains how to add and run unit and integration tests for the `backupdr-mcp` package.

## Unit Testing

Unit tests are used to verify the logic of individual tools and utilities in isolation by mocking external dependencies (like the Google Cloud SDK).

### Directory Structure

Unit tests are located alongside the source files they test, using the `.test.ts` extension.

- Example: `src/tools/backup_vaults/create_backup_vault.ts` has its test at `src/tools/backup_vaults/create_backup_vault.test.ts`.

### Mocking Strategy

We use `vitest` to mock the API clients and factories:

- **API Client Factory**: Mock `../../utility/api_client_factory.js` to return a mock client.
- **SDK Clients**: Mock the specific methods of the BackupDR client (e.g., `createBackupVault`, `listBackupVaults`).

### Running Unit Tests

To run unit tests from the package root:

```bash
npm run test
```

Unit tests are configured in `vitest.config.ts` and are included in the default test run.

## Integration Testing

Integration tests verify the tools against real Google Cloud APIs.

### Directory Structure

Integration tests are located in `packages/backupdr-mcp/tests/integration`.

- `helpers.ts`: Contains test utilities like `expectSuccess`.
- `*.test.ts`: Individual test files for different tool categories (e.g., `backup_vaults.test.ts`).

### Configuration

Integration tests require a real Google Cloud project and authenticated credentials.

#### Environment Variables

- `GOOGLE_CLOUD_PROJECT`: (Required) The ID of the GCP project to run tests against.
- `GCP_PROJECT_ID`: (Optional) Alternative to `GOOGLE_CLOUD_PROJECT`.

#### Vitest Config

A separate configuration file `vitest.config.integration.ts` is used to:

- Isolate integration tests from unit tests.
- Set appropriate timeouts for long-running cloud operations (BackupDR operations often take several minutes).
- Point to the correct test files.

### Adding a New Integration Test

1.  **Create a test file**: Add a new file in `packages/backupdr-mcp/tests/integration/` (e.g., `backup_plans.test.ts`).
2.  **Import dependencies**:
    ```typescript
    import { describe, it, beforeAll, afterAll, expect } from 'vitest';
    import { expectSuccess } from './helpers.js';
    import { someTool } from '../../src/tools/.../some_tool.js';
    ```
3.  **Handle Long-Running Operations**:
    Set a generous timeout for your tests and hooks (e.g., 5 minutes).
    ```typescript
    it('should perform a long operation', async () => {
      // ...
    }, 300000); // 300,000ms = 5 minutes
    ```
4.  **Resource Cleanup**:
    Always ensure you clean up any resources created during the test in `afterAll` or `beforeAll` hooks. Use `try-catch` blocks to ignore errors if resources don't exist.

### Running Integration Tests

To run integration tests from the package root:

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
npm run test:integration
```

## Best Practices (General)

- **Unique Names**: Use timestamps or random suffixes for resource names (e.g., `test-resource-${Date.now()}`) to avoid collisions in integration tests.
- **Coverage**: Aim for high statement coverage in unit tests. Integration tests should focus on critical path and API contract validation.
- **Idempotent Cleanup**: Make sure your cleanup logic handles cases where the resource was never created or already deleted.
