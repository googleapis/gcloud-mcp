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

import { spawn } from 'child_process';

export const isAvailable = (): Promise<boolean> =>
  new Promise((resolve) => {
    const which = spawn('which', ['gcloud']);
    which.on('close', (code) => {
      resolve(code === 0);
    });
    which.on('error', () => {
      resolve(false);
    });
  });

export const invoke = (args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const gcloud = spawn('gcloud', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    gcloud.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    gcloud.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gcloud.on('close', (code) => {
      // All responses from gcloud, including non-zero codes.
      resolve({ code, stdout, stderr });
    });
    gcloud.on('error', (err) => {
      // Process failed to start. gcloud isn't able to be invoked.
      reject(err);
    });
  });
