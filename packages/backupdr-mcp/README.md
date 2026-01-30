# BackupDR MCP Server ☁️

Model Context Protocol (MCP) Server for interacting with Google Cloud Backup and Disaster Recovery.
It enables AI assistants to easily interact with Google Cloud Backup and Disaster Recovery. 

With the BackupDR MCP server you can:

- **Interact with Google Cloud BackupDR using natural language.** Describe the
  outcome you want instead of memorizing complex command syntax, flags, and
  arguments.

- **Automate and simplify complex workflows.** Chain multiple operations
  into a single, repeatable command to reduce manual effort and the chance of
  error.

- **Lower the barrier to entry for backup management.** Empower team
  members who are less familiar with GCBDR to perform powerful actions confidently
  and safely.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm):
  version 20 or higher
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) (for authentication)

## ✨ Set up your MCP server

### Gemini CLI and Gemini Code Assist

To integrate the BackupDR MCP server with Gemini CLI or Gemini Code Assist, run the
setup command below. This will install the MCP server as a
[Gemini CLI extension](https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md)
for the current user, making it available for all your projects.

```shell
npx @google-cloud/backupdr-mcp init --agent=gemini-cli --access-level=READ_ONLY
```

After the initialization process, you can verify that the backupdr-mcp server is
configured correctly by running the following command:

```
gemini mcp list

> ✓ backupdr (from backupdr-mcp): npx -y backupdr-mcp --access-level READ_ONLY (stdio) - Connected
```

By default, the server only enables read only tools. To enable
tools that can create or update or delete, use the
`--access-level` flag:

```shell
npx @google-cloud/backupdr-mcp init --agent=gemini-cli --access-level=UPSERT
```

When access level is UPSERT : create and update tools are made avaible to agent in addition to the read tools.

```shell
npx @google-cloud/backupdr-mcp init --agent=gemini-cli --access-level=ALL
```

When access level is ALL : all tools (including delete) are made avaible to agent.

### For other AI clients

To use the BackupDR MCP server with other clients, add the following snippet to their
respective JSON configuration files:

```json
"gcs": {
  "command": "npx",
  "args": ["-y", "@google-cloud/backupdr-mcp"]
}
```

Instructions for popular tools:

- **Claude Desktop:** Open **Claude > Settings > Developer > Edit Config** and
  edit `claude_desktop_config.json`.
- **Cline:** Click the MCP Servers icon, then **Configure MCP Servers** to edit
  `cline_mcp_settings.json`.
- **Cursor:** Edit `.cursor/mcp.json` for a single project or
  `~/.cursor/mcp.json` for all projects.
- **Gemini CLI (Manual Setup):**
  [If not using extensions](#gemini-cli-and-gemini-code-assist), edit
  `.gemini/settings.json` for a single project or `~/.gemini/settings.json` for
  all projects.

For **Visual Studio Code** edit the `.vscode/mcp.json` file in your workspace
for a single project or your global user settings file for all projects:

```json
"servers": {
  "gcs": {
    "command": "npx",
    "args": ["-y", "@google-cloud/backupdr-mcp"]
  }
}
```

## 🛠 Local Development

For more information regarding installing the repository locally, please see
[development.md](doc/DEVELOPMENT.md)

### Testing

```shell
npm run test
```

## 🧰 Available MCP Tools

The BackupDR MCP server offers different sets of tools based on the configured access level. By default, only the `READ_ONLY` tools are enabled.

### READ_ONLY Tools

These tools allow for discovery and inspection of BackupDR resources without making any changes.

| Tool                           | Description                                                                 |
| :----------------------------- | :-------------------------------------------------------------------------- |
| `list_backup_vaults`           | Lists all backup vaults in a given project and location.                    |
| `get_backup_vault`             | Gets details of a specific backup vault.                                    |
| `list_backup_plans`            | Lists all backup plans in a given project and location.                    |
| `get_backup_plan`              | Gets details of a specific backup plan.                                     |
| `list_backup_plan_associations` | Lists all associations between backup plans and resources.                  |
| `get_backup_plan_association`   | Gets details of a specific backup plan association.                         |
| `list_datasources`             | Lists all data sources within a backup vault.                               |
| `get_datasource`               | Gets details of a specific data source.                                     |
| `list_backups`                 | Lists all backups for a given data source.                                  |
| `get_backup`                   | Gets details of a specific backup.                                          |
| `find_protectable_resources`   | Discovers resources (VMs, Disks, SQL) that can be protected.                |
| `get_backupdr_operation`       | Retrieves the status of a long-running BackupDR operation.                  |
| `get_csql_operation`           | Retrieves the status of a long-running Cloud SQL operation.                  |

### UPSERT Tools

These tools allow creating and updating resources, including performing restore operations. They can be enabled by setting the access level to `UPSERT`.

| Tool                             | Description                                                               |
| :------------------------------- | :------------------------------------------------------------------------ |
| `create_backup_vault`            | Creates a new backup vault in a specified location.                       |
| `create_backup_plan`             | Creates a new backup plan with defined rules and retention.               |
| `update_backup_plan`             | Modifies an existing backup plan.                                         |
| `create_backup_plan_association` | Associates a resource with a backup plan to start protection.             |
| `restore_backup`                 | Restores a backup to a target Compute Engine instance or disk.            |
| `csql_restore`                   | Restores a Cloud SQL backup to a target instance.                         |

### ALL Tools (Destructive)

These tools include the ability to delete resources. Enable them only when necessary by setting the access level to `ALL`.

| Tool                             | Description                                                               |
| :------------------------------- | :------------------------------------------------------------------------ |
| `delete_backup_vault`            | **Deletes** a backup vault.                                               |
| `delete_backup_plan`             | **Deletes** a backup plan.                                                |
| `delete_backup_plan_association` | **Removes** protection from a resource by deleting its association.       |
| `delete_backup`                  | **Deletes** a specific backup from a vault.                               |

## 🔑 MCP Permissions

The permissions of the BackupDR MCP are directly tied to the permissions of the
authenticated user or service account. To restrict permissions and operate with
the principle of least privilege, you can
[authorize gcloud as a service account](https://cloud.google.com/sdk/docs/authorizing#service-account)
and assign the service account a
[role with limited permissions](https://cloud.google.com/iam/docs/roles-overview)
for Google Cloud Backup and Disaster Recvery.

## 👥 Contributing

We welcome contributions! Whether you're fixing bugs, sharing feedback, or
improving documentation, your contributions are welcome. Please read our
[Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 Important Notes

This repository is currently in preview and may see breaking changes. This
repository is providing a solution, not an officially supported Google product.
It may break when the MCP specification, other SDKs, or when other solutions
and products change. See also our [Security Policy](SECURITY.md).
