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

import { Argv, ArgumentsCamelCase, CommandModule } from 'yargs';
import { initializeGeminiCLI } from './init-gemini-cli.js';
import * as gcloud from '../gcloud.js';
import { log } from '../utility/logger.js';

interface InstallArgs {
  agent: string;
  local: boolean;
}

export const init: CommandModule<object, InstallArgs> = {
  command: 'init',
  describe: 'Initialize the MCP server with an agent.',
  builder: (yargs: Argv) =>
    yargs
      .option('agent', {
        describe: 'The agent to initialize the MCP server with.',
        type: 'string',
        choices: ['gemini-cli'] as const,
        demandOption: true,
      })
      .option('local', {
        describe: '(Development only) Use a local build of the gcloud-mcp server.',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv: ArgumentsCamelCase<InstallArgs>) => {
    if (argv.agent === 'gemini-cli') {
      await initializeGeminiCLI(argv['local']);
    } else {
      throw new Error(`Unknown agent: ${argv.agent}`);
    }
    const isAvailable = await gcloud.isAvailable();
    if (!isAvailable) {
      log.warn(
        "⚠️❗ gcloud executable not found. The MCP server won't start unless gcloud is available.",
      );
    }
  },
};
