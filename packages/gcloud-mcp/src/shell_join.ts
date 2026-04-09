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
 * Joins an array of arguments into a single command string, quoting any
 * argument that contains spaces so that `gcloud meta lint-gcloud-commands
 * --command-string` can parse them correctly.
 *
 * Without quoting, an argument like
 *   `resource.type=cloud_run_revision AND severity>=WARNING`
 * would be split into three separate tokens by the linter, causing an
 * `UnrecognizedArgumentsError`.
 *
 * @see https://github.com/googleapis/gcloud-mcp/issues/385
 */
export const shellJoinArgs = (args: string[]): string =>
  args.map((arg) => (arg.includes(' ') ? `'${arg}'` : arg)).join(' ');
