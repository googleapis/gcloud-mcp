package client

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func InvokeMCPTool(serverArgs []string, toolName string, toolArgs any) (string, error) {
	if len(serverArgs) == 0 {
		return "", fmt.Errorf("no server args provided. Usage: server_name [<args>]")
	}

	var (
		ctx       = context.Background()
		transport mcp.Transport
	)

	cmd := exec.Command(serverArgs[0], serverArgs[1:]...)
	transport = &mcp.CommandTransport{Command: cmd}
	client := mcp.NewClient(&mcp.Implementation{Name: "mcp-client", Version: "v1.0.0"}, nil)
	cs, err := client.Connect(ctx, transport, nil)
	if err != nil {
		return "", fmt.Errorf("failed to connect: %w", err)
	}
	defer cs.Close()

	if toolName != "" {
		result, err := cs.CallTool(ctx, &mcp.CallToolParams{
			Name:      toolName,
			Arguments: toolArgs,
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
