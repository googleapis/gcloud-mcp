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
import os from 'os';

export const initializeClaude = async (
  local = false,
  enableDestructiveTools = false,
  fs = { mkdir, readFile, writeFile },
) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Create directory
    const extensionDir = join(os.homedir(), '.claude', 'extensions', 'storage-mcp');
    await fs.mkdir(extensionDir, { recursive: true });

    // Create claude-extension.json
    const extensionFile = join(extensionDir, 'claude-extension.json');
    const commandArgs = local ? ['-y', 'storage-mcp'] : ['-y', '@google-cloud/storage-mcp'];
    if (enableDestructiveTools) {
      commandArgs.push('--enable-destructive-tools=true');
    }
    const extensionJson = {
      name: 'storage-mcp' + (local ? '-local' : ''),
      version: pkg.version,
      description: 'Enable MCP-compatible AI agents to interact with Google Cloud Storage.',
      contextFileName: 'CLAUDE.md',
      mcpServers: {
        gcs: {
          command: 'npx',
          args: commandArgs,
        },
      },
    };
    await fs.writeFile(extensionFile, JSON.stringify(extensionJson, null, 2));
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${extensionFile}`);

    // Create CLAUDE.md
    const claudeMdSrcPath = join(__dirname, '../../CLAUDE-extension.md');
    const claudeMdDestPath = join(extensionDir, 'CLAUDE.md');
    const claudeMdContent = await fs.readFile(claudeMdSrcPath);
    await fs.writeFile(claudeMdDestPath, claudeMdContent);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${claudeMdDestPath}`);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`🌱 storage-mcp Claude extension initialized.`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : undefined;
    log.error('❌ storage-mcp Claude extension initialized failed.', error);
  }
};
