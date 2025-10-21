# ✅ ❌ Allowlisting/Denylisting Commands

The allowlist/denylist regulates the execution of gcloud commands by the AI agent. This denylist prevents unintended or unauthorized operations by prohibiting specific commands and/or command groups. Should a particular command or command group be present in the denylist **OR** not in the allowlist, all associated operations will be blocked.

## ✖️ Default Denylist

The default denylist is **ALWAYS** enforced and is not configurable by the user. This list is linked below:

https://github.com/googleapis/gcloud-mcp/blob/db103694232825be66227bd80029e9afaa00f4a4/packages/gcloud-mcp/src/index.ts#L31-L42

## ⚙️ Configuring the Allowlisted/Denylisted Commands

You can configure the allow/denylist by providing a JSON configuration file. The path to this file can be specified using the `-c` or `--config` command-line flag. The path must be an absolute path.

Example `~/.gemini/extensions/gcloud/gemini-extension.json` or `settings.json`:

```json
{
  // ...
  "gcloud": {
    "command": "npx",
    "args": [
      "-y",
      "@google-cloud/gcloud-mcp",
      "-c",
      "/abs/path/to/config.json" // Path must be absolute
    ]
  }
}
```

The configuration file can contain **either** an **`allow`** or a **`deny`** key, but not both. Each key takes a list of strings, where each string is a command or command group.

Example `config.json`:

To allow only commands in the `gcloud compute instances` group:

```json
{
  "allow": ["compute instances"]
}
```

To deny specific commands and command groups:

```json
{
  "deny": [
    "compute instances delete", // Denies alpha/beta/GA of this command.
    "alpha", // Denies all alpha commands
    "beta" // Denies all beta commands
  ]
}
```

### Enforcement Rules:

- The allowlist or denylist applies to all tools provided by the gcloud-mcp server.
- A [default denylist](#️-default-denylist) of unsafe commands is **ALWAYS** enforced and cannot be overridden.
- Allowlisting a command only allows that specific release track. (e.g.`beta storage` allows beta storage commands, but not alpha or GA storage commands.)
- Denylisting a GA (General Availability) command denies all its release tracks (`alpha`, `beta`, and `GA`).
- Denylisting a pre-GA command (e.g., `alpha`) denies only that release track.
- Entries can be command groups (e.g., `compute` or `compute instances`) or full commands (e.g., `compute instances delete`).
