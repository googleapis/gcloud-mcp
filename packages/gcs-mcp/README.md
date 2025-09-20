# GCS MCP Server ☁️

The GCS
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro)
server enables AI assistants to easily interact with Google Cloud Storage for
bucket and object management. With the GCS MCP server you can:

- **Interact with Google Cloud Storage using natural language.** Describe the
  outcome you want instead of memorizing complex command syntax, flags, and
  arguments.
- **Automate and simplify complex workflows.** Chain multiple storage operations
  into a single, repeatable command to reduce manual effort and the chance of
  error.
- **Lower the barrier to entry for cloud storage management.** Empower team
  members who are less familiar with GCS to perform powerful actions confidently
  and safely.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm):
  version 20 or higher
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) (for authentication)

## ✨ Set up your MCP server

### Gemini CLI and Gemini Code Assist

To integrate the GCS MCP server with Gemini CLI or Gemini Code Assist, run the
setup command below. This will install the MCP server as a
[Gemini CLI extension](https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md)
for the current user, making it available for all your projects.

```shell
npx @google-cloud/gcs-mcp init --agent=gemini-cli
```

After the initialization process, you can verify that the gcs-mcp server is
configured correctly by running the following command:

```
gemini mcp list

> ✓ gcs: npx -y @google-cloud/gcs-mcp (stdio) - Connected
```

### For other AI clients

To use the GCS MCP server with other clients, add the following snippet to their
respective JSON configuration files:

```json
"gcs": {
  "command": "npx",
  "args": ["-y", "@google-cloud/gcs-mcp"]
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
    "args": ["-y", "@google-cloud/gcs-mcp"]
  }
}
```

## 🛠 Local Development

For more information regarding installing the repository locally, please see
[development.md](doc/DEVELOPMENT.md)

## 🧰 Available MCP Tools

### Object Tools

| Tool                             | Description                                               |
| :------------------------------- | :-------------------------------------------------------- |
| `list_objects`                   | Lists objects in a GCS bucket.                            |
| `read_object_metadata`           | Reads comprehensive metadata for a specific object.       |
| `read_object_content`            | Reads the content of a specific object.                   |
| `delete_object`                  | Deletes a specific object from a bucket.                  |
| `write_object`                   | Writes a new object to a bucket.                          |
| `update_object_metadata`         | Updates the custom metadata of an existing object.        |
| `copy_object`                    | Copies an object from one bucket to another.              |
| `move_object`                    | Moves an object from one bucket to another.               |
| `generate_download_signed_url`   | Generates a signed URL for downloading an object.         |
| `generate_upload_signed_url`     | Generates a signed URL for uploading an object.           |
| `upload_object`                    | Uploads a file to a GCS bucket.                           |

### Bucket Tools

| Tool                      | Description                                        |
| :------------------------ | :------------------------------------------------- |
| `list_buckets`            | Lists all buckets in a project.                    |
| `create_bucket`           | Creates a new bucket.                              |
| `delete_bucket`           | Deletes a bucket.                                  |
| `get_bucket_metadata`     | Gets comprehensive metadata for a specific bucket. |
| `update_bucket_labels`    | Updates labels for a bucket.                       |
| `get_bucket_location`     | Gets the location of a bucket.                     |
| `view_iam_policy`         | Views the IAM policy for a bucket.                 |
| `check_iam_permissions`   | Tests IAM permissions for a bucket.                |

## 🔑 MCP Permissions

The permissions of the GCS MCP are directly tied to the permissions of the
authenticated user or service account. To restrict permissions and operate with
the principle of least privilege, you can
[authorize gcloud as a service account](https://cloud.google.com/sdk/docs/authorizing#service-account)
and assign the service account a
[role with limited permissions](https://cloud.google.com/iam/docs/roles-overview)
for Google Cloud Storage.

## 👥 Contributing

We welcome contributions! Whether you're fixing bugs, sharing feedback, or
improving documentation, your contributions are welcome. Please read our
[Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 Important Notes

This repository is currently in preview and may see breaking changes. This
repository is providing a solution, not an officially supported Google product.
It may break when the MCP specification, other SDKs, or when other solutions
and products change. See also our [Security Policy](SECURITY.md).