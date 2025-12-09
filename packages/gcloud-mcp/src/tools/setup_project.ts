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

interface SetupStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  output?: string;
  error?: string;
}

const COMMON_APIS: Record<string, string[]> = {
  compute: ['compute.googleapis.com'],
  storage: ['storage.googleapis.com'],
  'cloud-run': ['run.googleapis.com', 'artifactregistry.googleapis.com'],
  'cloud-functions': ['cloudfunctions.googleapis.com', 'cloudbuild.googleapis.com'],
  kubernetes: ['container.googleapis.com'],
  bigquery: ['bigquery.googleapis.com'],
  pubsub: ['pubsub.googleapis.com'],
  firestore: ['firestore.googleapis.com'],
  'cloud-sql': ['sqladmin.googleapis.com'],
};

export const createSetupProject = () => ({
  register: (server: McpServer) => {
    server.registerTool(
      'setup_project',
      {
        title: 'Setup GCP project',
        description: `Configures a GCP project by enabling APIs and setting default region/zone in a single operation.

## What This Tool Does:
1. Enables specified GCP APIs
2. Sets default compute region and zone
3. Sets the project as the default in gcloud config

## Use Cases:
- Bootstrap a new GCP project for development
- Enable multiple APIs at once (e.g., for a Cloud Run + Firestore app)
- Configure project defaults after creation

## Available API Groups:
- compute: Compute Engine API
- storage: Cloud Storage API
- cloud-run: Cloud Run + Artifact Registry APIs
- cloud-functions: Cloud Functions + Cloud Build APIs
- kubernetes: Google Kubernetes Engine API
- bigquery: BigQuery API
- pubsub: Pub/Sub API
- firestore: Firestore API
- cloud-sql: Cloud SQL Admin API

## Returns:
Status of each configuration step.`,
        inputSchema: {
          project: z.string().describe('GCP project ID to configure'),
          enableApis: z
            .array(z.string())
            .optional()
            .describe(
              'API groups to enable (e.g., ["compute", "storage", "cloud-run"]) or specific API names (e.g., ["run.googleapis.com"])',
            ),
          region: z
            .string()
            .optional()
            .describe('Default compute region to set (e.g., us-central1)'),
          zone: z.string().optional().describe('Default compute zone to set (e.g., us-central1-a)'),
          setAsDefault: z
            .boolean()
            .optional()
            .default(true)
            .describe('Set this project as the default in gcloud config'),
        },
      },
      async ({ project, enableApis, region, zone, setAsDefault }) => {
        const toolLogger = log.mcp('setup_project', { project, enableApis, region, zone });
        toolLogger.info('Setting up GCP project');

        const steps: SetupStep[] = [];

        const addStep = (name: string): SetupStep => {
          const step: SetupStep = { name, status: 'pending' };
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
                    : s.status === 'skipped'
                      ? '⏭️'
                      : s.status === 'running'
                        ? '⏳'
                        : '⬚';
              let line = `${icon} ${s.name}`;
              if (s.error) {
                line += `\n   Error: ${s.error}`;
              }
              return line;
            })
            .join('\n');

        try {
          if (setAsDefault) {
            const setProjectStep = addStep('Set default project');
            setProjectStep.status = 'running';

            const setProjectResult = await gcloud.invoke(['config', 'set', 'project', project]);

            if (setProjectResult.code !== 0) {
              setProjectStep.status = 'failed';
              setProjectStep.error = setProjectResult.stderr;
            } else {
              setProjectStep.status = 'success';
            }
          }

          if (enableApis && enableApis.length > 0) {
            const apisToEnable: string[] = [];

            for (const api of enableApis) {
              if (COMMON_APIS[api]) {
                apisToEnable.push(...COMMON_APIS[api]!);
              } else if (api.includes('.googleapis.com')) {
                apisToEnable.push(api);
              } else {
                apisToEnable.push(`${api}.googleapis.com`);
              }
            }

            const uniqueApis = [...new Set(apisToEnable)];

            for (const api of uniqueApis) {
              const enableStep = addStep(`Enable ${api}`);
              enableStep.status = 'running';

              const enableResult = await gcloud.invoke([
                'services',
                'enable',
                api,
                '--project',
                project,
              ]);

              if (enableResult.code !== 0) {
                enableStep.status = 'failed';
                enableStep.error = enableResult.stderr;
              } else {
                enableStep.status = 'success';
              }
            }
          }

          if (region) {
            const setRegionStep = addStep(`Set default region: ${region}`);
            setRegionStep.status = 'running';

            const setRegionResult = await gcloud.invoke([
              'config',
              'set',
              'compute/region',
              region,
            ]);

            if (setRegionResult.code !== 0) {
              setRegionStep.status = 'failed';
              setRegionStep.error = setRegionResult.stderr;
            } else {
              setRegionStep.status = 'success';
            }
          }

          if (zone) {
            const setZoneStep = addStep(`Set default zone: ${zone}`);
            setZoneStep.status = 'running';

            const setZoneResult = await gcloud.invoke(['config', 'set', 'compute/zone', zone]);

            if (setZoneResult.code !== 0) {
              setZoneStep.status = 'failed';
              setZoneStep.error = setZoneResult.stderr;
            } else {
              setZoneStep.status = 'success';
            }
          }

          const failedSteps = steps.filter((s) => s.status === 'failed');
          const successSteps = steps.filter((s) => s.status === 'success');

          const output = `# GCP Project Setup ${failedSteps.length > 0 ? 'Completed with Errors' : 'Complete'}

## Project: ${project}

## Configuration Steps
${formatSteps()}

## Summary
- ✅ Successful: ${successSteps.length}
- ❌ Failed: ${failedSteps.length}
${
  failedSteps.length > 0
    ? `
## Troubleshooting
Some steps failed. Common causes:
- Missing permissions (need roles/owner or roles/serviceusage.serviceUsageAdmin)
- API quota exceeded
- Invalid region/zone name

Run \`gcloud projects get-iam-policy ${project}\` to check your permissions.`
    : ''
}
## Next Steps
- Run \`get_gcloud_context\` to verify the configuration
- Use \`check_iam_permissions\` to verify your access`;

          return {
            content: [{ type: 'text', text: output }],
            isError: failedSteps.length > 0,
          };
        } catch (e: unknown) {
          toolLogger.error('setup_project failed', e instanceof Error ? e : new Error(String(e)));
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return {
            content: [{ type: 'text', text: `# GCP Project Setup Failed\n\nError: ${msg}` }],
            isError: true,
          };
        }
      },
    );
  },
});
