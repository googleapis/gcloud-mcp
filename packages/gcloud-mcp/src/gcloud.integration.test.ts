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

import { test, expect, assert } from 'vitest';
import * as gcloud from './gcloud.js';

test('gcloud is available', async () => {
  const result = await gcloud.isAvailable();
  expect(result).toBe(true);
});

test('can invoke gcloud to lint a command', async () => {
  const result = await gcloud.lint('compute instances list');
  assert(result.success);
  expect(result.parsedCommand).toBe('compute instances list');
}, 10000);

test('cannot inject a command by appending arguments', async () => {
  const result = await gcloud.invoke(['config', 'list', '&&', 'echo', 'asdf']);
  expect(result.stdout).not.toContain('asdf');
  expect(result.code).toBeGreaterThan(0);
}, 10000);

test('cannot inject a command by appending command', async () => {
  const result = await gcloud.invoke(['config', 'list', '&&', 'echo asdf']);
  expect(result.code).toBeGreaterThan(0);
}, 10000);

test('cannot inject a command with a final argument', async () => {
  const result = await gcloud.invoke(['config', 'list', '&& echo asdf']);
  expect(result.code).toBeGreaterThan(0);
}, 10000);

test('cannot inject a command with a single argument', async () => {
  const result = await gcloud.invoke(['config list && echo asdf']);
  expect(result.code).toBeGreaterThan(0);
}, 10000);

test('can invoke windows gcloud when there are multiple python args', async () => {
  // Set the environment variables correctly and then reimport gcloud to force it to reload
  process.env['CLOUDSDK_PYTHON_ARGS'] = '-S -u -B';
  const gcloud = await import('./gcloud.js');
  const result = await gcloud.invoke(['config', 'list']);
  expect(result.code).toBe(0);
}, 10000);

test('can invoke windows gcloud when there are 1 python args', async () => {
  // Set the environment variables correctly and then reimport gcloud to force it to reload
  process.env['CLOUDSDK_PYTHON_ARGS'] = '-u';
  const gcloud = await import('./gcloud.js');
  const result = await gcloud.invoke(['config', 'list']);
  expect(result.code).toBe(0);
}, 10000);

test('can invoke windows gcloud when there are no python args', async () => {
  // Set the environment variables correctly and then reimport gcloud to force it to reload
  process.env['CLOUDSDK_PYTHON_ARGS'] = '';
  const gcloud = await import('./gcloud.js');
  const result = await gcloud.invoke(['config', 'list']);
  expect(result.code).toBe(0);
}, 10000);

test('can invoke windows gcloud when site packages are enabled', async () => {
  // Set the environment variables correctly and then reimport gcloud to force it to reload
  process.env['CLOUDSDK_PYTHON_SITEPACKAGES'] = '1';
  const gcloud = await import('./gcloud.js');
  const result = await gcloud.invoke(['config', 'list']);
  expect(result.code).toBe(0);
}, 10000);

test('can invoke windows gcloud when site packages are enabled and python args exists', async () => {
  // Set the environment variables correctly and then reimport gcloud to force it to reload
  process.env['CLOUDSDK_PYTHON_SITEPACKAGES'] = '1';
  process.env['CLOUDSDK_PYTHON_ARGS'] = '-u';
  const gcloud = await import('./gcloud.js');
  const result = await gcloud.invoke(['config', 'list']);
  expect(result.code).toBe(0);
}, 10000);
