# 🛠️🚧👨‍💻 Local Development

## Setup

### Clone the GitHub Repository

```bash
git clone https://github.com/googleapis/gcloud-mcp.git
cd gcloud-mcp
```

This will create a directory named `gcloud-mcp` and move you into it.

---

### Install the gcloud-mcp Server

```bash
npm install
cd packages/<mcp_server_name>   # Example: packages/gcloud-mcp
npm link                        # Makes the bin command (e.g. "gcloud-mcp") available globally
npm install -g @google/gemini-cli   # If not already installed
```

---

### Initialize the gcloud-mcp Server with Gemini CLI

```bash
npx gcloud-mcp init --agent=gemini-cli --local
```

**NOTE: The `--local` flag changes where the client’s MCP server configuration points (local or remote).**

---

### 📊 Local vs Remote Comparison

| Mode        | Where it points                                  | When to use                                        |
| ----------- | ------------------------------------------------ | -------------------------------------------------- |
| `--local`   | Local npm link (`gcloud-mcp` inside repo)        | When developing/testing changes in your fork/clone |
| _(no flag)_ | Remote npm registry (`@google-cloud/gcloud-mcp`) | When using the published package                   |

---

### Example Walkthrough

```bash
# Inside ~/usr/local/username/development/gcloud-mcp
npx gcloud-mcp init --agent=gemini-cli
gemini   # The client reflects local changes since init ran inside the repo

cd ~/usr/local/username/development/my-other-project
npx gcloud-mcp init --agent=gemini-cli
gemini   # The client will NOT reflect local changes (points to remote registry)

npx gcloud-mcp init --agent=gemini-cli --local
gemini   # Now the client reflects local changes (points to local install)
```

---

### 🧹 Cleanup / Reset

If you want to unlink your local installation and return to the remote registry:

```bash
cd packages/gcloud-mcp
npm unlink
npm uninstall -g gcloud-mcp
```

Then re-run `npx gcloud-mcp init --agent=gemini-cli` **without** the `--local` flag.

---

### 🛠️ Troubleshooting

- **Command not found** → Ensure you ran `npm link` inside the correct `packages/<mcp_server_name>` folder.··
- **Client not reflecting changes** → Check whether you initialized with `--local` or not.··
- **Conflicts with global install** → Run the cleanup/reset steps and reinstall cleanly.··
