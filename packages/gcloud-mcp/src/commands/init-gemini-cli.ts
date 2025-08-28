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

import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from '../../package.json' with { type: 'json' };
import { log } from '../utility/logger.js';

export const initializeGeminiCLI = async (local = false, fs = { mkdir, readFile, writeFile }) => {
  try {
    // When running `npm start -w [workspace]`, npm sets the CWD to the workspace directory.
    // INIT_CWD is an environment variable set by npm that holds the original CWD.
    // Use the original CWD if it exists, otherwise use the process' CWD.
    const cwd = process.env['INIT_CWD'] || process.cwd();
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Create directory
    const extensionDir = join(cwd, '.gemini', 'extensions', 'gcloud-mcp');
    await fs.mkdir(extensionDir, { recursive: true });

    // Create gemini-extension.json
    const extensionFile = join(extensionDir, 'gemini-extension.json');
    const extensionJson = {
      name: pkg.name + (local ? ' [LOCAL]' : ''),
      version: pkg.version,
      description: 'Enable MCP-compatible AI agents to interact with Google Cloud.',
      contextFileName: 'GEMINI.md',
      mcpServers: {
        gcloud: {
          command: 'npx',
          args: local ? ['-y', 'gcloud-mcp'] : ['-y', '@google-cloud/gcloud-mcp'],
        },
      },
    };
    await fs.writeFile(extensionFile, JSON.stringify(extensionJson, null, 2));
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${extensionFile}`);

    // Create GEMINI.md
    const geminiMdSrcPath = join(__dirname, '../../GEMINI-extension.md');
    const geminiMdDestPath = join(extensionDir, 'GEMINI.md');
    const geminiMdContent = await fs.readFile(geminiMdSrcPath);
    await fs.writeFile(geminiMdDestPath, geminiMdContent);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${geminiMdDestPath}`);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`🌱 gcloud-mcp Gemini CLI extension initialized.`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : undefined;
    log.error('❌ gcloud-mcp Gemini CLI extension initialized failed.', error);
  }
};
