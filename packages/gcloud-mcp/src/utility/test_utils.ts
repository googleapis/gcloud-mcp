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

import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';

export class FakeChildProcess extends EventEmitter {
  stdout: Readable;
  stderr: Readable;
  stdin: Writable;
  pid = 12345;
  killed = false;

  constructor() {
    super();
    this.stdout = new Readable({ read() {} });
    this.stderr = new Readable({ read() {} });
    this.stdin = new Writable({ write() {} });
  }

  kill(signal?: NodeJS.Signals): boolean {
    this.killed = true;
    setTimeout(() => {
      this.stdout.push(null);
      this.stderr.push(null);
      this.emit('close', null, signal || 'SIGTERM');
    }, 0);
    return true;
  }
}

export const createMockChildProcess = (stdout: string, stderr = '', exitCode = 0): ChildProcess => {
  const fakeProcess = new FakeChildProcess();
  fakeProcess.stdout.push(stdout);
  fakeProcess.stdout.push(null); // End of stdout stream
  fakeProcess.stderr.push(stderr);
  fakeProcess.stderr.push(null); // End of stderr stream

  // Simulate process close event
  setTimeout(() => {
    fakeProcess.emit('close', exitCode);
  }, 0); // Emit asynchronously

  return fakeProcess as unknown as ChildProcess;
};
