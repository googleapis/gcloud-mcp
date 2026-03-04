[![gcloud-mcp Servers CI](https://github.com/googleapis/gcloud-mcp/actions/workflows/presubmit.yml/badge.svg)](https://github.com/googleapis/gcloud-mcp/actions/workflows/presubmit.yml)
[![License](https://img.shields.io/github/license/googleapis/gcloud-mcp)](https://github.com/googleapis/gcloud-mcp/blob/main/LICENSE)

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

## 📡 Available MCP Servers

This repository also hosts other MCP servers in addition to the gcloud MCP
server. An up to date list is below, and links to other Google Cloud MCP
servers hosted outside of this repo are
[here](#-other-google-cloud-mcp-servers).

| MCP Server Name | Description                                                                   | Package Name        | Version                                                                                                                                   |
| :-------------- | :---------------------------------------------------------------------------- | :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| gcloud          | Interact with Google Cloud via the gcloud CLI using natural language prompts. | `gcloud-mcp`        | [![Version](https://img.shields.io/npm/v/@google-cloud/gcloud-mcp)](https://www.npmjs.com/package/@google-cloud/gcloud-mcp)               |
| observability   | Access Google Cloud Observability APIs to query logs, metrics, and traces.    | `observability-mcp` | [![Version](https://img.shields.io/npm/v/@google-cloud/observability-mcp)](https://www.npmjs.com/package/@google-cloud/observability-mcp) |
| storage         | Interact with Google Cloud Storage for bucket and object management.          | `storage-mcp`       | [![Version](https://img.shields.io/npm/v/@google-cloud/storage-mcp)](https://www.npmjs.com/package/@google-cloud/storage-mcp)             |
| backupdr        | Interact with Google Cloud Backup and Disaster Recovery.                      | `backupdr-mcp`      | [![Version](https://img.shields.io/npm/v/@google-cloud/backupdr-mcp)](https://www.npmjs.com/package/@google-cloud/backupdr-mcp)           |

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
npx @google-cloud/[PACKAGE_NAME] init --agent=gemini-cli
```

For example, for the gcloud-mcp:

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
- **Gemini CLI (Manual Setup):** [If not using extensions](#gemini-cli-and-gemini-code-assist),
  edit `.gemini/settings.json` for a single project or `~/.gemini/settings.json` for
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

| MCP Server    | Tool                             | Description                                                                                                                                               |
| :------------ | :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| gcloud        | `run_gcloud_command`             | Executes a gcloud command. Some commands have been restricted from execution by the agent. See [MCP Permissions](#-mcp-permissions) for more information. |
| observability | `list_log_entries`               | Lists log entries from a project.                                                                                                                         |
|               | `list_log_names`                 | Lists log names from a project.                                                                                                                           |
|               | `list_buckets`                   | Lists log buckets from a project.                                                                                                                         |
|               | `list_views`                     | Lists log views from a project.                                                                                                                           |
|               | `list_sinks`                     | Lists log sinks from a project.                                                                                                                           |
|               | `list_log_scopes`                | Lists log scopes from a project.                                                                                                                          |
|               | `list_metric_descriptors`        | Lists metric descriptors for a project.                                                                                                                   |
|               | `list_time_series`               | Lists time series data for a given metric.                                                                                                                |
|               | `list_alert_policies`            | Lists the alert policies in a project.                                                                                                                    |
|               | `list_traces`                    | Searches for traces in a project.                                                                                                                         |
|               | `get_trace`                      | Gets a specific trace by id in a project.                                                                                                                 |
|               | `list_group_stats`               | Lists the error groups for a project.                                                                                                                     |
| storage       | `list_objects`                   | Lists objects in a GCS bucket.                                                                                                                            |
|               | `read_object_metadata`           | Reads comprehensive metadata for a specific object.                                                                                                       |
|               | `read_object_content`            | Reads the content of a specific object.                                                                                                                   |
|               | `delete_object`                  | Deletes a specific object from a bucket.                                                                                                                  |
|               | `write_object`                   | Writes a new object to a bucket.                                                                                                                          |
|               | `update_object_metadata`         | Updates the custom metadata of an existing object.                                                                                                        |
|               | `copy_object`                    | Copies an object from one bucket to another.                                                                                                              |
|               | `move_object`                    | Moves an object from one bucket to another.                                                                                                               |
|               | `upload_object`                  | Uploads a file to a GCS bucket.                                                                                                                           |
|               | `download_object`                | Downloads an object from GCS to a local file.                                                                                                             |
|               | `list_buckets`                   | Lists all buckets in a project.                                                                                                                           |
|               | `create_bucket`                  | Creates a new bucket.                                                                                                                                     |
|               | `delete_bucket`                  | Deletes a bucket.                                                                                                                                         |
|               | `get_bucket_metadata`            | Gets comprehensive metadata for a specific bucket.                                                                                                        |
|               | `update_bucket_labels`           | Updates labels for a bucket.                                                                                                                              |
|               | `get_bucket_location`            | Gets the location of a bucket.                                                                                                                            |
|               | `view_iam_policy`                | Views the IAM policy for a bucket.                                                                                                                        |
|               | `check_iam_permissions`          | Tests IAM permissions for a bucket.                                                                                                                       |
|               | `get_metadata_table_schema`      | Checks if GCS insights service is enabled and returns the BigQuery table schema for a given insights dataset configuration.                               |
|               | `execute_insights_query`         | Executes a BigQuery SQL query against an insights dataset and returns the result.                                                                         |
|               | `list_insights_configs`          | Lists the names of all Storage Insights dataset configurations for a given project.                                                                       |
| backupdr      | `list_backup_vaults`             | Lists all backup vaults in a given project and location.                                                                                                  |
|               | `get_backup_vault`               | Gets details of a specific backup vault.                                                                                                                  |
|               | `list_backup_plans`              | Lists all backup plans in a given project and location.                                                                                                   |
|               | `get_backup_plan`                | Gets details of a specific backup plan.                                                                                                                   |
|               | `list_backup_plan_associations`  | Lists all associations between backup plans and resources.                                                                                                |
|               | `get_backup_plan_association`    | Gets details of a specific backup plan association.                                                                                                       |
|               | `list_datasources`               | Lists all data sources within a backup vault.                                                                                                             |
|               | `get_datasource`                 | Gets details of a specific data source.                                                                                                                   |
|               | `list_backups`                   | Lists all backups for a given data source.                                                                                                                |
|               | `get_backup`                     | Gets details of a specific backup.                                                                                                                        |
|               | `find_protectable_resources`     | Discovers resources (VMs, Disks, SQL) that can be protected.                                                                                              |
|               | `get_backupdr_operation`         | Retrieves the status of a long-running BackupDR operation.                                                                                                |
|               | `get_csql_operation`             | Retrieves the status of a long-running Cloud SQL operation.                                                                                               |
|               | `create_backup_vault`            | Creates a new backup vault in a specified location.                                                                                                       |
|               | `create_backup_plan`             | Creates a new backup plan with defined rules and retention.                                                                                               |
|               | `update_backup_plan`             | Modifies an existing backup plan.                                                                                                                         |
|               | `create_backup_plan_association` | Associates a resource with a backup plan to start protection.                                                                                             |
|               | `restore_backup`                 | Restores a backup to a target Compute Engine instance or disk.                                                                                            |
|               | `csql_restore`                   | Restores a Cloud SQL backup to a target instance.                                                                                                         |
|               | `delete_backup_vault`            | **Deletes** a backup vault.                                                                                                                               |
|               | `delete_backup_plan`             | **Deletes** a backup plan.                                                                                                                                |
|               | `delete_backup_plan_association` | **Removes** protection from a resource by deleting its association.                                                                                       |
|               | `delete_backup`                  | **Deletes** a specific backup from a vault.                                                                                                               |

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
