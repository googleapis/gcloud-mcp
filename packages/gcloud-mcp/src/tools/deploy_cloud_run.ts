/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as gcloud from '../gcloud.js';
import { log } from '../utility/logger.js';
import { z } from 'zod';

interface DeploymentStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  output?: string;
  error?: string;
}

export const createDeployCloudRun = () => ({
  register: (server: McpServer) => {
    server.registerTool(
      'deploy_cloud_run',
      {
        title: 'Deploy to Cloud Run',
        description: `Deploys a container image to Cloud Run in a single operation.

## What This Tool Does:
1. Deploys the specified container image to Cloud Run
2. Waits for the deployment to complete
3. Returns the service URL

## Use Cases:
- Deploy a new Cloud Run service from a container image
- Update an existing Cloud Run service with a new image
- Deploy with specific configuration (memory, CPU, environment variables)

## Prerequisites:
- Container image must already exist in a registry (e.g., gcr.io, Artifact Registry)
- Cloud Run API must be enabled in the project
- Appropriate IAM permissions (run.services.create, run.services.update)

## Returns:
The deployed service URL and deployment status.`,
        inputSchema: {
          serviceName: z.string().describe('Name of the Cloud Run service'),
          image: z
            .string()
            .describe(
              'Container image to deploy (e.g., gcr.io/project/image:tag or us-docker.pkg.dev/project/repo/image:tag)',
            ),
          region: z.string().describe('GCP region to deploy to (e.g., us-central1, europe-west1)'),
          project: z.string().optional().describe('GCP project ID (uses default if not specified)'),
          allowUnauthenticated: z
            .boolean()
            .optional()
            .default(false)
            .describe('Allow unauthenticated access to the service'),
          memory: z
            .string()
            .optional()
            .describe('Memory limit (e.g., 512Mi, 1Gi, 2Gi). Default: 512Mi'),
          cpu: z.string().optional().describe('CPU limit (e.g., 1, 2). Default: 1'),
          envVars: z
            .record(z.string())
            .optional()
            .describe('Environment variables as key-value pairs'),
          port: z.number().optional().describe('Container port. Default: 8080'),
          minInstances: z.number().optional().describe('Minimum number of instances'),
          maxInstances: z.number().optional().describe('Maximum number of instances'),
        },
      },
      async ({
        serviceName,
        image,
        region,
        project,
        allowUnauthenticated,
        memory,
        cpu,
        envVars,
        port,
        minInstances,
        maxInstances,
      }) => {
        const toolLogger = log.mcp('deploy_cloud_run', { serviceName, image, region });
        toolLogger.info('Starting Cloud Run deployment');

        const steps: DeploymentStep[] = [];

        const addStep = (name: string): DeploymentStep => {
          const step: DeploymentStep = { name, status: 'pending' };
          steps.push(step);
          return step;
        };

        const formatSteps = (): string =>
          steps
            .map((s) => {
              const icon =
                s.status === 'success'
                  ? '✅'
                  : s.status === 'failed'
                    ? '❌'
                    : s.status === 'running'
                      ? '⏳'
                      : '⬚';
              return `${icon} ${s.name}${s.error ? `: ${s.error}` : ''}`;
            })
            .join('\n');

        try {
          const deployStep = addStep('Deploy to Cloud Run');
          deployStep.status = 'running';

          const args = ['run', 'deploy', serviceName, '--image', image, '--region', region];

          if (project) {
            args.push('--project', project);
          }

          if (allowUnauthenticated) {
            args.push('--allow-unauthenticated');
          } else {
            args.push('--no-allow-unauthenticated');
          }

          if (memory) {
            args.push('--memory', memory);
          }

          if (cpu) {
            args.push('--cpu', cpu);
          }

          if (port) {
            args.push('--port', port.toString());
          }

          if (minInstances !== undefined) {
            args.push('--min-instances', minInstances.toString());
          }

          if (maxInstances !== undefined) {
            args.push('--max-instances', maxInstances.toString());
          }

          if (envVars && Object.keys(envVars).length > 0) {
            const envString = Object.entries(envVars)
              .map(([k, v]) => `${k}=${v}`)
              .join(',');
            args.push('--set-env-vars', envString);
          }

          args.push('--format=json');

          const deployResult = await gcloud.invoke(args);

          if (deployResult.code !== 0) {
            deployStep.status = 'failed';
            deployStep.error = deployResult.stderr || 'Deployment failed';

            return {
              content: [
                {
                  type: 'text',
                  text: `# Cloud Run Deployment Failed

## Steps
${formatSteps()}

## Error Details
\`\`\`
${deployResult.stderr}
\`\`\``,
                },
              ],
              isError: true,
            };
          }

          deployStep.status = 'success';

          let serviceUrl = '';
          try {
            const deployOutput = JSON.parse(deployResult.stdout);
            serviceUrl = deployOutput.status?.url || '';
          } catch {
            const urlMatch = deployResult.stdout.match(/https:\/\/[^\s]+\.run\.app/);
            if (urlMatch) {
              serviceUrl = urlMatch[0];
            }
          }

          const getUrlStep = addStep('Get service URL');
          getUrlStep.status = 'running';

          if (!serviceUrl) {
            const describeResult = await gcloud.invoke([
              'run',
              'services',
              'describe',
              serviceName,
              '--region',
              region,
              ...(project ? ['--project', project] : []),
              '--format=value(status.url)',
            ]);

            if (describeResult.code === 0) {
              serviceUrl = describeResult.stdout.trim();
            }
          }

          getUrlStep.status = serviceUrl ? 'success' : 'failed';

          const output = `# Cloud Run Deployment Complete

## Service Details
| Property | Value |
|----------|-------|
| Service Name | ${serviceName} |
| Region | ${region} |
| Image | ${image} |
| URL | ${serviceUrl || '(unavailable)'} |

## Steps
${formatSteps()}

## Next Steps
${serviceUrl ? `- Test your service: \`curl ${serviceUrl}\`` : ''}
- View logs: \`gcloud run services logs read ${serviceName} --region=${region}\`
- Update service: Use this tool again with a new image tag`;

          return {
            content: [{ type: 'text', text: output }],
          };
        } catch (e: unknown) {
          toolLogger.error(
            'deploy_cloud_run failed',
            e instanceof Error ? e : new Error(String(e)),
          );
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return {
            content: [{ type: 'text', text: `# Cloud Run Deployment Failed\n\nError: ${msg}` }],
            isError: true,
          };
        }
      },
    );
  },
});
