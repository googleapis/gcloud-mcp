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
 * `gcloud meta lint-gcloud-commands --command-string`, quoting or masking any
 * element that contains whitespace so it survives that command's own
 * re-tokenization as a single argument.
 *
 * `gcloud meta lint-gcloud-commands` tokenizes its `--command-string`
 * differently depending on the platform it runs on
 * (`lib/surface/meta/lint_gcloud_commands.py::_separate_command_arguments`):
 * POSIX `shlex.split()` elsewhere, but `shlex.split(s, posix=False)` on
 * Windows. The non-POSIX mode neither processes backslash escapes nor strips
 * quote characters from a token, and only re-groups whitespace into one
 * token when a quote is the very first character of that token. So a flag
 * like `--sql=SELECT 1`, naively quoted as `"--sql=SELECT 1"`, keeps its
 * literal leading `"` and stops being classified as a flag (it no longer
 * starts with `--`), and gets rejected as an unrecognized positional
 * argument instead.
 *
 * The lint result never reports argument values back to the caller
 * (`command_string_no_args` strips them) and access-control matching only
 * ever looks at the command path, never at flag values, so on Windows it's
 * safe to erase whitespace inside a value instead of quoting it: the linter
 * only needs to see one token in the right shape -- a leading `--flag` still
 * starting with `--`, a positional staying one word -- to classify the
 * command correctly.
 */
const quoteForPosix = (arg: string): string => {
  if (!arg.includes('"')) return `"${arg}"`;
  if (!arg.includes("'")) return `'${arg}'`;
  return `"${arg.replace(/"/g, '\\"')}"`;
};

const quoteForWindows = (arg: string): string => {
  if (arg.startsWith('-') || arg.includes('"') || arg.includes("'")) {
    return arg.replace(/\s+/g, '_');
  }
  return `'${arg}'`;
};

export const toCommandString = (args: string[]): string =>
  args
    .map((arg) => {
      if (arg === '') return '""';
      if (!/\s/.test(arg)) return arg;
      return process.platform === 'win32' ? quoteForWindows(arg) : quoteForPosix(arg);
    })
    .join(' ');
