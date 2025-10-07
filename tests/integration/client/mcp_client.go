package client

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ToolCall struct {
	ServerCmd []string
	ToolName  string
	ToolArgs  any
}

func InvokeMCPTool(toolCall ToolCall) (string, error) {
	if len(toolCall.ServerCmd) == 0 {
		return "", fmt.Errorf("no server args provided. Usage: server_name [<args>]")
	}

	var (
		ctx       = context.Background()
		transport mcp.Transport
	)

	cmd := exec.Command(toolCall.ServerCmd[0], toolCall.ServerCmd[1:]...)
	transport = &mcp.CommandTransport{Command: cmd}
	client := mcp.NewClient(&mcp.Implementation{Name: "mcp-client", Version: "v1.0.0"}, nil)
	cs, err := client.Connect(ctx, transport, nil)
	if err != nil {
		return "", fmt.Errorf("failed to connect: %w", err)
	}
	defer cs.Close()

	if toolCall.ToolName != "" {
		result, err := cs.CallTool(ctx, &mcp.CallToolParams{
			Name:      toolCall.ToolName,
			Arguments: toolCall.ToolArgs,
		})
		if err != nil {
			return "", fmt.Errorf("tool execution failed: %w", err)
		}
		resultJSON, err := json.MarshalIndent(result, "", "  ")
		if err != nil {
			return "", fmt.Errorf("failed to format tool result: %w", err)
		}
		return string(resultJSON), nil
	}
	return "", nil
}
