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
 * Joins an argv-style array into a single command string suitable for
 * `gcloud meta lint-gcloud-commands --command-string`, quoting any element
 * that contains whitespace so it survives that command's own re-tokenization
 * as a single argument.
 *
 * Without this, an element like `--sql=SELECT 1` (a single argv entry with
 * an embedded space, e.g. a SQL query passed as a flag value) is
 * indistinguishable from two separate arguments once naively joined with
 * spaces, and gets split back apart by the linter.
 */
export const toCommandString = (args: string[]): string =>
  args
    .map((arg) => (arg === '' || /\s/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg))
    .join(' ');
