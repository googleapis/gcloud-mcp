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

import { mkdir, readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import pkg from '../../package.json' with { type: 'json' };
import { log } from '../utility/logger.js';
import os from 'os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const initializeGeminiCLI = async (
  local = false,
  accessLevel: 'READ_ONLY' | 'UPSERT' | 'ALL' | undefined,
  overwriteContextFile = true,
  fs = { mkdir, readFile, writeFile, access },
) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const markdownPath = path.resolve(__dirname, '../GEMINI-extension.md');

    // Read the content of GEMINI-extension.md
    const geminiMdContent = await fs.readFile(markdownPath, 'utf8');

    // Create directory
    const extensionDir = join(os.homedir(), '.gemini', 'extensions', 'backupdr-mcp');
    await fs.mkdir(extensionDir, { recursive: true });

    const args = local ? ['-y', 'backupdr-mcp'] : ['-y', '@google-cloud/backupdr-mcp'];
    if (accessLevel) {
      args.push('--access-level', accessLevel);
    }

    // Create gemini-extension.json
    const extensionFile = join(extensionDir, 'gemini-extension.json');
    const extensionJson = {
      name: 'backupdr-mcp' + (local ? '-local' : ''),
      version: pkg.version,
      description:
        'Enable MCP-compatible AI agents to interact with Google Cloud Backup and Disaster Recovery.',
      contextFileName: 'GEMINI.md',
      mcpServers: {
        backupdr: {
          command: 'npx',
          args,
        },
      },
    };
    await fs.writeFile(extensionFile, JSON.stringify(extensionJson, null, 2));
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${extensionFile}`);

    // Create GEMINI.md
    const geminiMdDestPath = join(extensionDir, 'GEMINI.md');
    let shouldWrite = true;
    if (!overwriteContextFile) {
      try {
        await fs.access(geminiMdDestPath);
        shouldWrite = false;
        // Intentional output to stdin. Not part of the MCP server.
        // eslint-disable-next-line no-console
        console.log(`Skipped: ${geminiMdDestPath} (already exists)`);
      } catch {
        // File doesn't exist, proceed to write
      }
    }

    if (shouldWrite) {
      await fs.writeFile(geminiMdDestPath, geminiMdContent);
      // Intentional output to stdin. Not part of the MCP server.
      // eslint-disable-next-line no-console
      console.log(`Created: ${geminiMdDestPath}`);
    }
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`🌱 backupdr-mcp Gemini CLI extension initialized.`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : undefined;
    log.error('❌ backupdr-mcp Gemini CLI extension initialized failed.', error);
  }
};
