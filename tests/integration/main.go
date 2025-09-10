package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	fmt.Println("🚀 Starting gcloud-mcp integration test...")

	cmd := exec.Command("gemini", "-d", "mcp", "list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Printf("Error executing command: %v\n", err)
		fmt.Println("Output:")
		fmt.Println(string(output))
		os.Exit(1)
	}

	fmt.Println("Command output:")
	fmt.Println(string(output))

	expectedMCPServers := map[string]string{
		"gcloud":        "gcloud-mcp",
		"observability": "observability-mcp",
	}

	for serverName, binCommand := range expectedMCPServers {
		expectedOutput := fmt.Sprintf("%s: npx -y %s (stdio) - Connected", serverName, binCommand)
		if strings.Contains(string(output), expectedOutput) {
			fmt.Printf("✅ Assertion passed: Output contains the connected %s server line.\n", serverName)
		} else {
			fmt.Printf("❌ Assertion failed: Output did not contain the connected %s server line.\n", serverName)
			os.Exit(1)
		}
	}
	os.Exit(0)
}
