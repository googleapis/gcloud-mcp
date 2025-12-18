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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListBackupsTool } from './list_backups.js';
import { registerGetBackupTool } from './get_backup.js';
import { registerDeleteBackupTool } from './delete_backup.js';
import { registerRestoreBackupTool } from './restore_backup.js';

export const registerBackupsTools = (server: McpServer) => {
  registerListBackupsTool(server);
  registerGetBackupTool(server);
  registerDeleteBackupTool(server);
  registerRestoreBackupTool(server);
};
