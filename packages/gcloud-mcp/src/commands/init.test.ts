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
import * as gcloud from '../gcloud.js';
import { log } from '../utility/logger.js';

vi.mock('../gcloud.js', () => ({
  isAvailable: vi.fn(),
}));

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
      local: false,
    };
    await init.handler(argv);
    expect(initializeGeminiCLI).toHaveBeenCalled();
  });

  it('should initialize gemini when agent is gemini-cli and local is true', async () => {
    const argv = {
      agent: 'gemini-cli',
      $0: 'test',
      _: [],
      local: true,
    };
    await init.handler(argv);
    expect(initializeGeminiCLI).toHaveBeenCalledWith(true);
  });

  it('should throw an error if agent is not gemini-cli', async () => {
    const argv = {
      agent: 'not-gemini-cli',
      $0: 'test',
      _: [],
      local: false,
    };
    await expect(init.handler(argv)).rejects.toThrow('Unknown agent: not-gemini-cli');
    expect(initializeGeminiCLI).not.toHaveBeenCalled();
  });

  it('should warn if gcloud is not available', async () => {
    const loggerWarnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    vi.mocked(gcloud.isAvailable).mockResolvedValue(false);
    const argv = {
      agent: 'gemini-cli',
      $0: 'test',
      _: [],
      local: false,
    };
    await init.handler(argv);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "⚠️❗ gcloud executable not found. The MCP server won't start unless gcloud is available.",
    );
  });

  it('should not warn if gcloud is available', async () => {
    const loggerWarnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    vi.mocked(gcloud.isAvailable).mockResolvedValue(true);
    const argv = {
      agent: 'gemini-cli',
      $0: 'test',
      _: [],
      local: false,
    };
    await init.handler(argv);
    expect(loggerWarnSpy).not.toHaveBeenCalled();
  });
});
