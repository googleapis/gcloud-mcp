[![Version](https://img.shields.io/npm/v/@google-cloud/gcloud-mcp)](https://www.npmjs.com/package/@google-cloud/gcloud-mcp)

# gcloud MCP Server ☁️

The gcloud
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro)
server enables AI assistants to easily interact with the Google Cloud
environment using the gcloud CLI. With the gcloud MCP server you can:

- **Interact with Google Cloud using natural language.** Describe the outcome
  you want instead of memorizing complex command syntax, flags, and arguments.
- **Automate and simplify complex workflows.** Chain multiple cloud operations
  into a single, repeatable command to reduce manual effort and the chance of
  error.
- **Lower the barrier to entry for cloud management.** Empower team members who
  are less familiar with gcloud to perform powerful actions confidently and
  safely.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm):
  version 20 or higher
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)

## ✨ Set up your MCP server

### Gemini CLI and Gemini Code Assist

To integrate MCP servers with Gemini CLI or Gemini Code Assist, run the setup
command below from your home directory for MCP server listed in the table. This
will install the MCP server as a
[Gemini CLI extension](https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md).
for the current user, making it available for all your projects.

```shell
npx @google-cloud/gcloud-mcp init --agent=gemini-cli
```

After the initialization process, you can verify that the gcloud-mcp server is
configured correctly by running the following command:

```
gemini mcp list

> ✓ gcloud: npx -y @google-cloud/gcloud-mcp (stdio) - Connected
```

### For other AI clients

To use the gcloud-mcp server with other clients, add the following snippet
to their respective JSON configuration files for each MCP server:

```json
"gcloud": {
  "command": "npx",
  "args": ["-y", "@google-cloud/gcloud-mcp"]
}
```

Instructions for popular tools:

- **Claude Desktop:** Open **Claude > Settings > Developer > Edit Config** and
  edit `claude_desktop_config.json`.
- **Cline:** Click the MCP Servers icon, then **Configure MCP Servers** to edit
  `cline_mcp_settings.json`.
- **Cursor:** Edit `.cursor/mcp.json` for a single project or
  `~/.cursor/mcp.json` for all projects.
- **Gemini CLI (Manual Setup):** [If not using extensions](#gemini-cli-and-gemini-code-assist),
  edit `.gemini/settings.json` for a single project or `~/.gemini/settings.json` for
  all projects.

For **Visual Studio Code** edit the `.vscode/mcp.json` file in your workspace
for a single project or your global user settings file for all projects:

```json
"servers": {
  "gcloud": {
    "command": "npx",
    "args": ["-y", "@google-cloud/gcloud-mcp"]
  }
}
```

## 🛠 Local Development

For more information regarding installing the repository locally, please see
[development.md](doc/DEVELOPMENT.md)

## 🧰 Available MCP Tools

| Tool                 | Description                                                                                                                                               |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run_gcloud_command` | Executes a gcloud command. Some commands have been restricted from execution by the agent. See [MCP Permissions](#-mcp-permissions) for more information. |

## 🔑 MCP Permissions

The permissions of the gcloud MCP are directly tied to the permissions of the active
gcloud account. To restrict permissions and operate with the principle of least
privilege, you can
[authorize as a service account using impersonation](https://cloud.google.com/sdk/docs/authorizing#impersonation) and
assign the service account a
[role with limited permissions](https://cloud.google.com/iam/docs/roles-overview).

By default, the gcloud MCP prevents execution of gcloud commands that don't
make sense for AI agents. This is done to restrict commands that can run
arbitrary inputs and initiate interactive sessions. See
[here](https://github.com/googleapis/gcloud-mcp/blob/ed743f04272744e57aa4990f5fcd9816a05b03ba/packages/gcloud-mcp/src/index.ts#L29)
for the list of denied commands.

## 💫 Other Google Cloud MCP Servers

Google Cloud offers these other servers:

- [Firebase MCP](https://firebase.google.com/docs/cli/mcp-server)
- [Google Analytics MCP](https://github.com/googleanalytics/google-analytics-mcp)
- [Google Cloud Genmedia MCP](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia)
- [Google Cloud Run MCP](https://github.com/GoogleCloudPlatform/cloud-run-mcp)
- [Google Kubernetes Engine (GKE) MCP](https://github.com/GoogleCloudPlatform/gke-mcp)
- [Google Security Operations and Threat Intelligence MCP](https://github.com/google/mcp-security)
- [MCP Toolbox for Databases](https://github.com/googleapis/genai-toolbox)

## 👥 Contributing

We welcome contributions! Whether you're fixing bugs, sharing feedback, or
improving documentation, your contributions are welcome. Please read our
[Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 Important Notes

This repository is currently in preview and may see breaking changes. This
repository provides a solution, not an officially supported Google product. It
is not covered under [Google Cloud Terms of Service](https://cloud.google.com/terms).
It may break when the MCP specification, other SDKs, or when other solutions
and products change. See also our [Security Policy](SECURITY.md).
