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

import { describe, it, expect } from 'vitest';
import { toolWrapper, MAX_CHAR_LIMIT } from './tool_wrapper.js';

describe('toolWrapper', () => {
  it('should return the result of the callback in a CallToolResult object', async () => {
    const cb = async () => 'test result';
    const result = await toolWrapper(cb);
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'test result',
        },
      ],
    });
  });

  it('should truncate results longer than the character limit', async () => {
    const longString = 'a'.repeat(MAX_CHAR_LIMIT + 1);
    const cb = async () => longString;
    const result = await toolWrapper(cb);
    const expectedTruncatedString =
      longString.substring(0, MAX_CHAR_LIMIT) +
      `... (truncated due to ${MAX_CHAR_LIMIT} character limit)`;
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expectedTruncatedString,
        },
      ],
    });
  });

  it.each([
    { name: 'empty string', value: '' },
    { name: 'empty array', value: '[]' },
    { name: 'empty object', value: '{}' },
  ])('should return a user-friendly message for an $name result', async ({ value }) => {
    const cb = async () => value;
    const result = await toolWrapper(cb);
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Invoked tool returned an empty result',
        },
      ],
    });
  });

  it('should handle errors thrown by the callback', async () => {
    const errorMessage = 'test error';
    const cb = async () => {
      throw new Error(errorMessage);
    };
    const result = await toolWrapper(cb);
    const parsedError = JSON.parse(result.content[0]?.text as string);
    expect(parsedError.error.name).toBe('Error');
    expect(parsedError.error.message).toBe(errorMessage);
    expect(parsedError.error.stack).toBeDefined();
  });

  it('should handle non-Error objects thrown by the callback', async () => {
    const errorObject = 'a string error';
    const cb = async () => {
      throw errorObject;
    };
    const result = await toolWrapper(cb);
    const parsedError = JSON.parse(result.content[0]?.text as string);
    expect(parsedError.error.name).toBe('UnknownError');
    expect(parsedError.error.message).toBe(
      `An unknown error occurred: ${JSON.stringify(errorObject)}`,
    );
  });
});
