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

/**
 * Formats the metric string for MCP.
 * @param agentName - The name of the MCP agent client.
 * @param serverName - The name of the MCP server.
 * @param serverVersion - The version of the MCP server.
 * @param toolName - The name of the tool being used.
 * @returns The formatted metric string.
 */
function formatMcpMetric(
  agentName: string,
  serverName: string,
  serverVersion: string,
  toolName: string,
): string {
  return `goog-mcp/${agentName}/${serverName}/${serverVersion}/${toolName}`;
}

/**
 * Builds the MCP metric string from the server instance and tool name.
 * @param mcpServer - The McpServer instance.
 * @param toolName - The name of the tool being used.
 * @returns The formatted MCP metric string.
 */
export function buildMcpMetric(mcpServer: McpServer, toolName: string): string {
  const serverInfo = mcpServer.server['_serverInfo'];
  const clientInfo = mcpServer.server.getClientVersion();

  const serverName = serverInfo?.name ?? '';
  const serverVersion = serverInfo?.version ?? '';
  const agentName = clientInfo?.name ?? '';

  return formatMcpMetric(agentName, serverName, serverVersion, toolName);
}
