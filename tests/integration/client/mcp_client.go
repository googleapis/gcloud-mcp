package client

import (
	"context"
	"encoding/json"
	"fmt"
	"iter"
	"log"
	"os/exec"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func InvokeMCPTool(args []string, toolName string, toolArgsJSON string) (string, error) {
	if len(args) == 0 {
		return "", fmt.Errorf("usage: listfeatures <command> [<args>]")
	}

	var (
		ctx       = context.Background()
		transport mcp.Transport
	)

	cmd := exec.Command(args[0], args[1:]...)
	transport = &mcp.CommandTransport{Command: cmd}
	client := mcp.NewClient(&mcp.Implementation{Name: "mcp-client", Version: "v1.0.0"}, nil)
	cs, err := client.Connect(ctx, transport, nil)
	if err != nil {
		return "", fmt.Errorf("failed to connect: %w", err)
	}
	defer cs.Close()

	if toolName != "" {
		var toolArgs map[string]any
		if err := json.Unmarshal([]byte(toolArgsJSON), &toolArgs); err != nil {
			return "", fmt.Errorf("invalid tool arguments: %w", err)
		}
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
		fmt.Println(string(resultJSON))
		return string(resultJSON), nil
	}

	printSection("tools", cs.Tools(ctx, nil), func(t *mcp.Tool) string { return t.Name })
	return "", nil
}

func printSection[T any](name string, features iter.Seq2[T, error], featName func(T) string) {
	fmt.Printf("%s:\n", name)
	for feat, err := range features {
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("\t%s\n", featName(feat))
	}
	fmt.Println()
}
