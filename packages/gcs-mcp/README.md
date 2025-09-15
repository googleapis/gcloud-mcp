# Google Cloud Storage MCP Server ☁️

This server connects
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) clients (like
the [Gemini CLI](https://github.com/google-gemini/gemini-cli)) to Google Cloud
Storage (GCS) APIs to manage buckets and objects. It acts as a local bridge,
translating natural language commands from your CLI into the appropriate API
calls to help you **store, retrieve, and manage** your data in Google Cloud.

> To learn more about the underlying service, see the official documentation:
>
> - [Google Cloud Storage](https://cloud.google.com/storage/docs)

## 🚀 Getting Started

For prerequisites and setup instructions, please see the [root README](../../README.md#-getting-started).

### Authentication

You need to authenticate twice: once for your user account and once for the application itself.

```shell
# Authenticate your user account to the gcloud CLI
gcloud auth login

# Set up Application Default Credentials for the server.
# This allows the MCP server to securely make Google Cloud API calls on your behalf.
gcloud auth application-default login
```

#### Setting the Quota Project

All API requests made by this server require a Google Cloud project for
billing and API quota management. This is known as the "quota project". This
project will likely already be set in the gcloud CLI. The project selected as
the quota project will need to have the Cloud Storage API **enabled** or you
will see errors when attempting to use the tools.

If you need to control which project is used for quotas, run the following command (https://cloud.google.com/sdk/gcloud/reference/auth/application-default/set-quota-project):

```shell
# Set the project to be used for API quotas and billing by ADC
gcloud auth application-default set-quota-project YOUR_QUOTA_PROJECT_ID
```

This ensures that all API usage from this server is attributed to the correct project.

## Usage

Once the server is configured, you can ask your MCP client natural language questions about your Google Cloud Storage environment. Here are a few examples:

- **"List all the buckets in my project."**
- **"Show me the objects in the 'my-bucket' bucket."**
- **"Create a new bucket called 'my-new-bucket' in the 'us-central1' location."**
- **"Delete the 'stale-data.csv' object from 'my-bucket'."**

Your MCP client will translate these questions into the appropriate tool calls to fetch the data from Google Cloud.

## Tools Reference

The server exposes the following tools:

| Service | Tool | Description |
| --- | --- | --- |
| **Object Management** | `list_objects` | Lists objects in a GCS bucket with optional prefix filtering and delimiter-based hierarchical organization to browse folder-like structures. |
| | `read_object_metadata` | Reads comprehensive metadata for a specific object including size, content type, creation/update timestamps, MD5/CRC32C checksums, generation, and custom metadata. |
| | `read_object_content` | Reads the content of a specific object, automatically handling text files as UTF-8 and binary files as base64-encoded data with size limits for memory safety. |
| | `delete_object` | Deletes a specific object from a bucket with proper error handling for non-existent objects. |
| | `write_object` | Writes a new object to a bucket from base64-encoded content with automatic content type detection based on file extension or explicit content type specification. |
| | `update_object_metadata` | Updates the custom metadata of an existing object with key-value pairs, ensuring all values are converted to strings per GCS requirements. |
| | `copy_object` | Copies an object from one bucket to another or within the same bucket, preserving all metadata and content while creating a new object instance. |
| | `move_object` | Moves an object from one bucket to another or renames it within the same bucket by copying the object to the new location and deleting the original. |
| **Bucket Management** | `list_buckets` | Lists all buckets in a project with optional detailed metadata including location, storage class, creation time, versioning status, and labels. |
| | `create_bucket` | Creates a new bucket with configurable location, storage class (STANDARD, NEARLINE, COLDLINE, ARCHIVE), versioning, custom labels, and requester pays settings. |
| | `delete_bucket` | Deletes a bucket with optional force delete capability to remove non-empty buckets by first deleting all contained objects. |
| | `get_bucket_metadata` | Gets comprehensive metadata for a specific bucket including location, storage class, versioning status, labels, lifecycle rules, and access controls. |
| | `view_iam_policy` | Views the complete IAM policy for a bucket including all role bindings, member permissions, and policy version information. |
| | `update_iam_policy` | Updates the IAM policy for a bucket with role bindings, supporting add, remove, and replace operations for members in specific roles. |
| | `check_iam_permissions` | Tests specific IAM permissions for a bucket and returns detailed results showing which permissions are allowed or denied for the current user. |
| | `update_bucket_labels` | Updates labels for a bucket with key-value pairs for organization and billing purposes, ensuring all values are converted to strings. |
| | `get_bucket_location` | Gets the location, location type (region/multi-region), storage class, and creation/update timestamps for a bucket. |

## 🛡️ Important Notes

This repository is currently in prerelease and may see breaking changes until the first stable release (v1.0).

This repository is providing a solution, not an officially supported Google product. It may break when the MCP specification, other SDKs, or when other solutions and products change.

## 👥 Contributing

Please read our [Contributing Guide](../../CONTRIBUTING.md) to get started.

## 📝 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](../../LICENSE) file for details.
