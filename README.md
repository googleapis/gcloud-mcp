# gcloud MCP Server ☁️

The gcloud
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro)
server enables AI assistants to easily interact with the Google Cloud
environment using the gcloud CLI. With the gcloud MCP you can:

- **Interact with Google Cloud using natural language.** Describe the outcome
  you want instead of memorizing complex command syntax, flags, and arguments.
- **Automate and simplify complex workflows.** Chain multiple cloud operations
  into a single, repeatable command to reduce manual effort and the chance of
  error.
- **Lower the barrier to entry for cloud management.** Empower team members who
  are less familiar with gcloud to perform powerful actions confidently and
  safely.

## 📡 Available MCP Servers

This repository also hosts other MCP servers in addition to the gcloud MCP
server. An up to date list is below, and links to other Google Cloud MCP
servers hosted outside of this repo are
[here](#-other-google-cloud-mcp-servers).

| MCP Server Name | Description                                                                   | Package Name        |
| :-------------- | :---------------------------------------------------------------------------- | :------------------ |
| gcloud          | Interact with Google Cloud via the gcloud CLI using natural language prompts. | `gcloud-mcp`        |
| observability   | An MCP server for interacting with Google Cloud Observability APIs.           | `observability-mcp` |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm):
  version 20 or higher
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)

## ✨ Set up your MCP server

### Gemini CLI and Gemini Code Assist

To integrate gcloud MCP with Gemini CLI or Gemini Code Assist, you can run a
single setup command. This will configure it as a
[Gemini CLI extension](https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md).

To make the MCP server(s) available for all your projects, run the command in
your home directory. This will install the MCP server as a Gemini CLI extension
globally for the current user.

Alternatively, to make the MCP server(s) available for a specific project, run
the command from your project's root directory.

```shell
npx @google-cloud/[PACKAGE_NAME] init --agent=gemini-cli
```

For example, for the gcloud-mcp:

```shell
npx @google-cloud/gcloud-mcp init --agent=gemini-cli
```

See [Local Development](doc/DEVELOPMENT.md) for help installing from source.

After the initialization process, you can verify that the gcloud-mcp server is
configured correctly by running the following command:

```
gemini mcp list

> ✓ gcloud: npx -y @google-cloud/gcloud-mcp (stdio) - Connected
```

### For other AI clients

To use MCP servers in this repo with other clients, add the following snippet
to their respective JSON configuration files for each MCP server:

```json
"[SERVER_NAME]": {
  "command": "npx",
  "args": ["-y", "@google-cloud/[PACKAGE_NAME]"]
}
```

For example, for gcloud:

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
- **Gemini CLI (Manual Setup):** If not using extensions, edit
  `.gemini/settings.json` for a single project or `~/.gemini/settings.json` for
  all projects.

For **Visual Studio Code** edit the `.vscode/mcp.json` file in your workspace
for a single project or your global user settings file for all projects:

```json
"servers": {
  "[SERVER_NAME]": {
    "command": "npx",
    "args": ["-y", "@google-cloud/[PACKAGE_NAME]"]
  }
}
```

For example, for gcloud and observability:

```json
"servers": {
  "gcloud": {
    "command": "npx",
    "args": ["-y", "@google-cloud/gcloud-mcp"]
  },
  "observability": {
    "command": "npx",
    "args": ["-y", "@google-cloud/observability-mcp"]
  },
}
```

## 🛠 Local Development

For more information regarding installing the repository locally, please see
[development.md](doc/DEVELOPMENT.md)

## 🧰 Available MCP Tools

| MCP Server    | Tool                      | Description                                                                                                                                               |
| :------------ | :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| gcloud        | `run_gcloud_command`      | Executes a gcloud command. Some commands have been restricted from execution by the agent. See [MCP Permissions](#-mcp-permissions) for more information. |
| observability | `list_log_entries`        | Lists log entries from a project.                                                                                                                         |
|               | `list_log_names`          | Lists log names from a project.                                                                                                                           |
|               | `list_buckets`            | Lists log buckets from a project.                                                                                                                         |
|               | `list_views`              | Lists log views from a project.                                                                                                                           |
|               | `list_sinks`              | Lists log sinks from a project.                                                                                                                           |
|               | `list_log_scopes`         | Lists log scopes from a project.                                                                                                                          |
|               | `list_metric_descriptors` | Lists metric descriptors for a project.                                                                                                                   |
|               | `list_time_series`        | Lists time series data for a given metric.                                                                                                                |
|               | `list_alert_policies`     | Lists the alert policies in a project.                                                                                                                    |
|               | `list_traces`             | Searches for traces in a project.                                                                                                                         |
|               | `get_trace`               | Gets a specific trace by id in a project.                                                                                                                 |
|               | `list_group_stats`        | Lists the error groups for a project.                                                                                                                     |

## 🔑 MCP Permissions

The permissions of the gcloud MCP are directly tied to the permissions of the
gcloud user. To restrict permissions and operate with the principle of least
privilege, you can
[authorize as a service account](https://cloud.google.com/sdk/docs/authorizing#service-account) and
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

We welcome contributions to the gcloud MCP Server! Whether you're fixing bugs,
sharing feedback, or improving documentation, your contributions are welcome.
Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 Important Notes

This repository is currently in prerelease and may see breaking changes until
the first stable release (v1.0). This repository is providing a solution, not
an officially supported Google product. It may break when the MCP
specification, other SDKs, or when other solutions and products change. See
also our [Security Policy](SECURITY.md).
