package main

import (
	"encoding/json"
	"fmt"
	"integration/client"
	"os"
	"os/exec"
	"strings"
)

func testGeminiMcpList() error {
	fmt.Println("🚀 Starting gcloud-mcp integration test...")

	cmd := exec.Command("gemini", "mcp", "list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("error executing command: %v\nOutput:\n%s", err, string(output))
	}

	fmt.Println("Command output:")
	fmt.Println(string(output))

	expectedMCPServers := map[string]string{
		"gcloud":        "gcloud-mcp",
		"observability": "observability-mcp",
		"storage":           "storage-mcp"
	}

	for serverName, binCommand := range expectedMCPServers {
		expectedOutput := fmt.Sprintf("%s: npx -y %s (stdio) - Connected", serverName, binCommand)
		if !strings.Contains(string(output), expectedOutput) {
			return fmt.Errorf("assertion failed: output did not contain the connected %s server line", serverName)
		}
		fmt.Printf("✅ Assertion passed: Output contains the connected %s server line.\n", serverName)
	}
	return nil
}

func testCallGcloudMCPTool() error {
	fmt.Println("🚀 Starting gcloud-mcp tool call integration test...")
	gcloudToolCall := client.ToolCall{
		ServerCmd: []string{"gcloud-mcp"},
		ToolName:  "run_gcloud_command",
		ToolArgs: map[string]any{
			"args": []string{"config", "list", "--format=json"},
		},
	}

	output, err := client.InvokeMCPTool(gcloudToolCall)
	if err != nil {
		return fmt.Errorf("error executing command: %v\nOutput:\n%s", err, string(output))
	}
	type mcpOutput struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	type gcloudConfig struct {
		Core struct {
			Project string `json:"project"`
		} `json:"core"`
	}

	var parsedOutput mcpOutput
	if err := json.Unmarshal([]byte(output), &parsedOutput); err != nil {
		return fmt.Errorf("error parsing MCP output: %v", err)
	}

	if len(parsedOutput.Content) == 0 {
		return fmt.Errorf("MCP output content is empty")
	}

	var config gcloudConfig
	if err := json.Unmarshal([]byte(parsedOutput.Content[0].Text), &config); err != nil {
		return fmt.Errorf("error parsing gcloud config from MCP output: %v", err)
	}

	if config.Core.Project == "gcloud-mcp-testing" {
		fmt.Printf("✅ Assertion passed: Tool call was successful\n")
		return nil
	}

	return fmt.Errorf("assertion failed: Tool call was not successful. Tool call content: %s", output)
}

func run() int {
	if err := testGeminiMcpList(); err != nil {
		fmt.Printf("❌ %v\n", err)
		return 1
	}
	if err := testCallGcloudMCPTool(); err != nil {
		fmt.Printf("❌ %v\n", err)
		return 1
	}
	return 0
}

func main() {
	os.Exit(run())
}
