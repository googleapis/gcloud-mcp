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

/**
 * A test helper to streamline API response handling.
 *
 * This function takes a promise that resolves to an MCP tool's result.
 * It extracts the content from the result and handles different content types.
 *
 * @param promise A promise that resolves to the result of an MCP tool call.
 * @returns The extracted and processed content from the tool's result.
 */
export async function expectSuccess(promise: Promise<unknown>): Promise<unknown> {
  const result = (await promise) as {
    content?: Array<{ type: string; text?: string; resource?: unknown }>;
  };
  const content = result.content?.[0];

  if (!content) {
    throw new Error('API call failed to return content');
  }

  // Handle text-based responses, which are often JSON.
  if (content.type === 'text') {
    try {
      // Attempt to parse the text as JSON.
      const resultText = JSON.parse(content.text as string);

      // If the JSON object has a `success` property that is `false`,
      // it indicates a structured error from the tool.
      if (resultText.success === false) {
        throw new Error(`API call failed: ${resultText.error}`);
      }
      return resultText;
    } catch (_e) {
      // If parsing fails, assume it's a plain text response.
      return content.text;
    }
  }
  // Handle binary data, which is returned as a `resource` object.
  else if (content.type === 'resource') {
    return content.resource;
  }

  // For any other content types, return the content object directly.
  return content;
}
