# Gcloud MCP ☁️

The gcloud [Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro) server enables AI assistants to easily interact with the Google Cloud environment using the gcloud CLI. With the gcloud MCP you can:

- **Interact with Google Cloud using natural language.** Describe the outcome you want instead of memorizing complex command syntax, flags, and arguments.
- **Automate and simplify complex workflows.** Chain multiple cloud operations into a single, repeatable command to reduce manual effort and the chance of error.
- **Lower the barrier to entry for cloud management.** Empower team members who are less familiar with gcloud to perform powerful actions confidently and safely.

![Google Cloud MCP screenshot](./doc/assets/gemini-gcloud-mcp-screenshot.png)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)

## ✨ Setup your MCP server

### Gemini CLI and Gemini Code Assist

To integrate gcloud MCP with Gemini CLI or Gemini Code Assist, you can run a single setup command. This will configure it as a [Gemini CLI extension](https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md).

Run this command from your project's root directory (for a single project) or your home directory (for all projects):

```shell
$ npx -y @google-cloud/gcloud-mcp init --agent=gemini-cli
```

### For other AI clients

To use gcloud MCP with other clients, add the following to their respective JSON configuration files:

```json
"mcpServers": {
  "gcloud-mcp": {
    "command": "npx",
    "args": ["-y", "@google-cloud/gcloud-mcp"]
  }
}
```

Instructions for popular tools:

- **Claude Desktop:** Open **Claude > Settings > Developer > Edit Config** and edit `claude_desktop_config.json`.
- **Cline:** Click the MCP Servers icon, then **Configure MCP Servers** to edit `cline_mcp_settings.json`.
- **Cursor:** Edit `.cursor/mcp.json` for a single project or `~/.cursor/mcp.json` for all projects.
- **Visual Studio Code:** Edit `.vscode/mcp.json` for a single project or your global user settings file for all projects.
- **Gemini CLI (Manual Setup):** If not using extensions, edit `.gemini/settings.json` for a single project or `~/.gemini/settings.json` for all projects.

## 🧰 Available MCP Tools

This server exposes a single tool, `run_gcloud_command`, which executes a gcloud command. Some commands have been restricted from execution by the agent. See [denylist.md](doc/denylist.md) for more information.

## 🔑 MCP Permissions

The permissions of the gcloud MCP are directly tied to the permissions of the gcloud user. To restrict permissions and operate with the principle of least privilege, you can [authorize as a service account](https://cloud.google.com/sdk/docs/authorizing#service-account) and assign the service account a [role with limited permissions](https://cloud.google.com/iam/docs/roles-overview).

By default, gcloud MCP denies commands deemed unsafe for agents. See [denylist.md](doc/denylist.md) for more information.

## 💫 Other Google Cloud MCP Servers

### Google Cloud offers these other servers:

- [Cloud Run MCP](https://github.com/GoogleCloudPlatform/cloud-run-mcp)
- [Databases MCP](https://github.com/googleapis/genai-toolbox)
- [GKE MCP](https://github.com/GoogleCloudPlatform/gke-mcp)

## 🛡️ Important Notes

This repository is currently in prerelease and may see breaking changes until the first stable release (v1.0). It is not eligible for the [Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security).

This repository is providing a solution, not an officially supported Google product. It may break when the MCP specification, other SDKs, or when other solutions and products change.

## 👥 Contributing

We welcome contributions to the gcloud MCP Server! Whether you're fixing bugs, sharing feedback, or improving documentation, your contributions are welcome. Please read our [Contributing Guide](CONTRIBUTING.md) to get started.
