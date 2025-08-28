# 🛠️🚧👨‍💻 Local Development

## Setup

### Clone the Github Repository

```shell
git clone https://github.com/googleapis/gcloud-mcp.git
```

This will create a directory named `gcloud-mcp` in your current working directory. Go ahead and `cd` into that directory:

```shell
cd gcloud-mcp
```

### Install the gcloud-mcp Server

```shell
npm install
cd packages/<mcp_server_name>  # For example: packages/gcloud-mcp
npm link  # Makes the bin command available globally. For example "gcloud-mcp" available globally
npm install -g @google/gemini-cli  # If not already installed
```

### Initialize the gcloud-mcp Server with Gemini CLI

```shell
npx gcloud-mcp init --agent=gemini-cli --local
```

**NOTE: The `--local` flag changes what installation the client's MCP server configuration is pointing to (local or global).**

**WITHOUT the `--local` flag:**

```json
"mcpServers": {
    "gcloud": {
        "command": "npx",
        "args": [
        "-y",
        // References the npm remote registry UNLESS extension file inside repository directory.
        "@google-cloud/gcloud-mcp"
        ]
    }
}
```

The above server configuration will always be pulling from the remote npm registry, **UNLESS** the `init` command was run inside of your local `gcloud-mcp` repository.

**WITH the `--local` flag:**

```json
"mcpServers": {
    "gcloud": {
        "command": "npx",
        "args": [
        "-y",
        // References the LOCAL npm installation
        "gcloud-mcp"
        ]
    }
}
```

### Let's run through an example:

```shell
# Inside ~/usr/local/username/development/gcloud-mcp
npx gcloud-mcp init --agent=gemini-cli  # This create the extension file pointing to REMOTE
gemini # The client will reflect local changes since the extension file was initialized inside the project directory.

cd ~/usr/local/username/development/my-other-project
npx gcloud-mcp init --agent=gemini-cli
gemini  # The client will NOT reflect local changes since the extension file is pointing to the REMOTE registry.
npx gcloud-mcp init --agent=gemini-cli --local
gemini  # The client will reflect local changes since the extension file is pointing to the LOCAL install.
```
