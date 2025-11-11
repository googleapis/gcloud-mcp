#!/usr/bin/env node

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

import { build } from 'esbuild';

build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  platform: 'node',
  format: 'esm',
  external: ['google-auth-library', 'googleapis'],
}).catch(() => process.exit(1));
