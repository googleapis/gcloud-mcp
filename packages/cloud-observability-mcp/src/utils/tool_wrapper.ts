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

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const MAX_CHAR_LIMIT = 100000;

export async function toolWrapper(cb: () => Promise<string>): Promise<CallToolResult> {
  try {
    let result = await cb();
    // Enforce a tool response cap of 100,000 characters
    if (result.length > MAX_CHAR_LIMIT) {
      result =
        result.substring(0, MAX_CHAR_LIMIT) +
        `... (truncated due to ${MAX_CHAR_LIMIT} character limit)`;
    }

    // Modify empty returns to be natural language
    if (result === '' || result === '[]' || result === '{}') {
      result = 'Invoked tool returned an empty result';
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error: unknown) {
    // TODO(https://github.com/googleapis/gcloud-mcp/issues/80): Update to use the custom logger once it's made sharable between packages
    // eslint-disable-next-line no-console
    console.error('Error in toolWrapper:', error);
    if (error instanceof Error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
              },
            }),
          },
        ],
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: {
              name: 'UnknownError',
              message: `An unknown error occurred: ${JSON.stringify(error)}`,
            },
          }),
        },
      ],
    };
  }
}
