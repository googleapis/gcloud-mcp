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
import pkg from '../package.json' with { type: 'json' };

export const initializeGeminiCLI = async () => {
  // When running `npm start -w [workspace]`, npm sets the CWD to the workspace directory.
  // INIT_CWD is an environment variable set by npm that holds the original CWD.
  // Use the original CWD if it exists, otherwise use the process' CWD.
  const cwd = process.env['INIT_CWD'] || process.cwd();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Create directory
  const extensionDir = join(cwd, '.gemini', 'extensions', 'gcloud-mcp');
  await mkdir(extensionDir, { recursive: true });

  // Create gemini-extension.json
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const extensionJson = {
    name: pkg.name,
    version: pkg.version,
    description: 'Enable MCP-compatible AI agents to interact with Google Cloud.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      gcloud: {
        command: 'npm',
        args: ['start', '-w', 'gcloud-mcp'],
      },
    },
  };
  await writeFile(extensionFile, JSON.stringify(extensionJson, null, 2));
  console.log(`Gemini CLI extension initialized at: ${extensionFile}`);

  // Create GEMINI.md
  const geminiMdSrcPath = join(__dirname, '../GEMINI-extension.md');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');
  const geminiMdContent = await readFile(geminiMdSrcPath);
  await writeFile(geminiMdDestPath, geminiMdContent);
  console.log(`Gemini CLI extension initialized at: ${geminiMdDestPath}`);
};
