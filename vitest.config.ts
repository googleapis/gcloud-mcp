/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({ //eslint-disable-line import/no-default-export
  test: {
    include: ['**/src/**/*.test.ts', '**/src/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    globals: true,
    reporters: ['default', 'junit'],
    silent: true,
    outputFile: { junit: 'junit.xml' },
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['**/src/**/*'],
      reporter: [
        'cobertura',
        'html',
        'json',
        ['json-summary', { outputFile: 'coverage-summary.json' }],
        'lcov',
        'text',
        ['text', { file: 'full-text-summary.txt' }],
      ]
    },
  },
});
