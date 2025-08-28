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

import { vi, describe, it, expect, afterEach } from 'vitest';
import { init } from './init.js';
import { initializeGeminiCLI } from './init-gemini-cli.js';

vi.mock('./init-gemini-cli.js', () => ({
  initializeGeminiCLI: vi.fn(),
}));

describe('init', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize gemini when agent is gemini-cli', async () => {
    const argv = {
      agent: 'gemini-cli',
      $0: 'test',
      _: [],
    };
    await init.handler(argv);
    expect(initializeGeminiCLI).toHaveBeenCalled();
  });

  it('should throw an error if agent is not gemini-cli', async () => {
    const argv = {
      agent: 'not-gemini-cli',
      $0: 'test',
      _: [],
    };
    await expect(init.handler(argv)).rejects.toThrow('Unknown agent: not-gemini-cli');
    expect(initializeGeminiCLI).not.toHaveBeenCalled();
  });
});