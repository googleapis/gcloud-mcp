package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	fmt.Println("🚀 Starting gcloud-mcp integration test...")

	cmd := exec.Command("gemini", "mcp", "list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Printf("Error executing command: %v\n", err)
		fmt.Println("Output:")
		fmt.Println(string(output))
		os.Exit(1)
	}

	fmt.Println("Command output:")
	fmt.Println(string(output))

	expectedOutput := "gcloud: npx -y @google-cloud/gcloud-mcp"
	if strings.Contains(string(output), expectedOutput) {
		fmt.Println("Assertion passed: Output contains the gcloud server line.")
		os.Exit(0)
	} else {
		fmt.Println("Assertion failed: Output did not contain the gcloud server line.")
		os.Exit(1)
	}
}
