import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
  toolName: string
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

  const serverName = serverInfo?.name ?? "";
  const serverVersion = serverInfo?.version ?? "";
  const agentName = clientInfo?.name ?? "";

  return formatMcpMetric(
    agentName,
    serverName,
    serverVersion,
    toolName
  );
}
