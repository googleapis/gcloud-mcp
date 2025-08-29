# ❌ Denylisted Commands

The denylist feature serves as a robust security mechanism, regulating the execution of gcloud commands by the AI agent. This static denylist proactively prevents unintended or unauthorized operations by explicitly prohibiting specific commands and/or command groups. Should a particular command or command group be present in the denylist, all associated operations will be blocked.

**Note: The denylist is not configurable by the user.**

For security and operational reasons, the MCP server is restricted from executing certain commands. Prohibited actions include any command that allows for arbitrary code execution on remote systems or spawns continuous, interactive subprocesses. A list of these commands can be found in [index.ts](../packages/gcloud-mcp/src/index.ts#L30-40). This may be updated to reflect new security and operational requirements.

## Restrict Gemini CLI from running gcloud using run_shell_command

Gemini CLI's `run_shell_command` tool has a configuration option to block it from running certain commands. Consider adding gcloud to the blocked list of commands to avoid bypassing gcloud's denylist. For more information, see [Gemini CLI's documentation](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/shell.md#command-restriction-examples).
