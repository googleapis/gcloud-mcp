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
	args := []string{"gcloud-mcp"}
	toolName := "run_gcloud_command"
	toolArgsJSON := `{"args": ["config", "list", "--format=json"]}`
	output, err := client.InvokeMCPTool(args, toolName, toolArgsJSON)
	if err != nil {
		return fmt.Errorf("error executing command: %v\nOutput:\n%s", err, string(output))
	}
	configJSON := map[string]interface{}{}
	if err := json.Unmarshal([]byte(output), &configJSON); err != nil {
		return fmt.Errorf("error parsing JSON output: %v", err)
	}

	content := configJSON["content"].([]interface{})
	res := (content[0].(map[string]interface{}))
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(res["text"].(string)), &result); err != nil {
		return fmt.Errorf("error parsing JSON output: %v", err)
	}

	if result != nil && result["core"] != nil && result["core"].(map[string]interface{})["project"] == "gcloud-mcp-testing" {
		fmt.Printf("✅ Assertion passed: Tool call was successful\n")
		return nil
	}

	return fmt.Errorf("assertion failed: Tool call was not successful. Tool call content: %s", content)
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
