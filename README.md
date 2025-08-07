# gcloud MCP server

The gcloud MCP Server is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server that provides gcloud execution and context to AI agents via a Gemini-compatible extension interface.

## Use cases

* **Streamlining Cloud Operations**: Automate the setup, management, and scaling of Google Cloud resources and services. Think about automating complex deployment pipelines, configuring infrastructure on demand, or orchestrating data processing workflows across different GCP components.
* **Deep Cloud Data Insights**: Facilitate the extraction and analysis of valuable information residing within your Google Cloud environment. This could involve real-time monitoring of application performance, comprehensive auditing of resource usage, or deriving business intelligence from large datasets stored in BigQuery or Cloud Storage. 
* **Intelligent Cloud-Native Applications**: Develop advanced applications that leverage AI and machine learning to interact intelligently with Google Cloud services. Envision building tools that can proactively optimize cloud spending, provide smart recommendations for resource allocation, or create intelligent chatbots that manage your GCP projects. 

## Prerequisites

- Node.js
- npm
- Gemini CLI

## Installation

1. **[Install `gcloud`](https://cloud.google.com/sdk/docs/install)** and **[authenticate](https://cloud.google.com/docs/authentication/gcloud#local)** with your Google account.
2.  Clone the repository.
3.  Install the dependencies:
    ```bash
    npm install
    npm run build
    ```

## Initializing with Gemini

To initialize this extension with the Gemini CLI, run the following command in your project's root directory, or your user home directory:

```bash
npm start -w gcloud-mcp -- --gemini-cli-init
gemini
```

This will register the extension with Gemini, making the gcloud tools available in your chat sessions.

## Manually Running the Server

To start the server, run the following command:

```bash
npm start -w gcloud-mcp
```