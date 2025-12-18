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

import { z } from 'zod';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../../utility/logger.js';
import { protos } from '@google-cloud/backupdr';

// --- Shared Schemas ---

const customerEncryptionKeySchema = z.object({
  rawKey: z
    .string()
    .optional()
    .describe(
      'Optional. Specifies a 256-bit customer-supplied encryption key, encoded in RFC 4648 base64.',
    ),
  rsaEncryptedKey: z
    .string()
    .optional()
    .describe(
      'Optional. Specifies an RFC 4648 base64 encoded, RSA-wrapped 2048-bit customer-supplied encryption key.',
    ),
  kmsKeyName: z
    .string()
    .optional()
    .describe('Optional. The name of the encryption key that is stored in Google Cloud KMS.'),
  kmsKeyServiceAccount: z
    .string()
    .optional()
    .describe(
      'Optional. The service account being used for the encryption request for the given KMS key.',
    ),
});

// --- Compute Instance Schemas ---

const guestOsFeatureSchema = z.object({
  type: z
    .enum([
      'FEATURE_TYPE_UNSPECIFIED',
      'VIRTIO_SCSI_MULTIQUEUE',
      'WINDOWS',
      'MULTI_IP_SUBNET',
      'UEFI_COMPATIBLE',
      'SECURE_BOOT',
      'GVNIC',
      'SEV_CAPABLE',
      'BARE_METAL_LINUX_COMPATIBLE',
      'SUSPEND_RESUME_COMPATIBLE',
      'SEV_LIVE_MIGRATABLE',
      'SEV_SNP_CAPABLE',
      'TDX_CAPABLE',
      'IDPF',
      'SEV_LIVE_MIGRATABLE_V2',
    ])
    .optional(),
});

const instanceRestoreDiskSchema = z.object({
  deviceName: z.string().optional(),
  source: z.string().optional(),
  diskSizeGb: z.string().optional(),
  diskType: z.string().optional(),
  diskInterface: z.enum(['DISK_INTERFACE_UNSPECIFIED', 'SCSI', 'NVME', 'NVDIMM']).optional(),
  provisionedIops: z.string().optional(),
  provisionedThroughput: z.string().optional(),
  resourcePolicies: z.array(z.string()).optional(),
  diskEncryptionKey: customerEncryptionKeySchema.optional(),
  guestOsFeatures: z.array(guestOsFeatureSchema).optional(),
});

const networkInterfaceSchema = z.object({
  network: z.string().optional(),
  subnetwork: z.string().optional(),
  networkIp: z.string().optional(),
  internalIpv6Prefix: z.string().optional(),
  accessConfigs: z
    .array(
      z.object({
        type: z.enum(['ONE_TO_ONE_NAT']).optional(),
        name: z.string().optional(),
        natIp: z.string().optional(),
        networkTier: z.enum(['PREMIUM', 'STANDARD']).optional(),
      }),
    )
    .optional(),
  aliasIpRanges: z
    .array(
      z.object({
        ipCidrRange: z.string().optional(),
        subnetworkRangeName: z.string().optional(),
      }),
    )
    .optional(),
  stackType: z.enum(['IPV4_ONLY', 'IPV4_IPV6']).optional(),
  nicType: z.enum(['VIRTIO_NET', 'GVNIC']).optional(),
});

const computeInstanceRestorePropertiesSchema = z.object({
  name: z.string().describe('Required. The name of the instance to be restored.'),
  description: z.string().optional(),
  machineType: z.string().optional(),
  canIpForward: z.boolean().optional(),
  confidentialInstanceConfig: z
    .object({
      enableConfidentialCompute: z.boolean().optional(),
    })
    .optional(),
  deletionProtection: z.boolean().optional(),
  disks: z.array(instanceRestoreDiskSchema).optional(),
  displayDevice: z
    .object({
      enableDisplay: z.boolean().optional(),
    })
    .optional(),
  guestAccelerators: z
    .array(
      z.object({
        acceleratorType: z.string().optional(),
        acceleratorCount: z.number().optional(),
      }),
    )
    .optional(),
  labels: z.record(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
  minCpuPlatform: z.string().optional(),
  networkInterfaces: z.array(networkInterfaceSchema).optional(),
  scheduling: z
    .object({
      onHostMaintenance: z.enum(['MIGRATE', 'TERMINATE']).optional(),
      automaticRestart: z.boolean().optional(),
      preemptible: z.boolean().optional(),
      provisioningModel: z.enum(['STANDARD', 'SPOT']).optional(),
      instanceTerminationAction: z.enum(['DELETE', 'STOP']).optional(),
    })
    .optional(),
  serviceAccounts: z
    .array(
      z.object({
        email: z.string().optional(),
        scopes: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  tags: z
    .object({
      items: z.array(z.string()).optional(),
    })
    .optional(),
  advancedMachineFeatures: z
    .object({
      enableNestedVirtualization: z.boolean().optional(),
      threadsPerCore: z.number().optional(),
      visibleCoreCount: z.number().optional(),
    })
    .optional(),
});

const computeInstanceTargetEnvironmentSchema = z.object({
  project: z.string().describe('Required. The project where the instance will be restored.'),
  zone: z.string().describe('Required. The zone where the instance will be restored.'),
});

// --- Disk Schemas ---

const diskRestorePropertiesSchema = z.object({
  name: z.string().optional().describe('Optional. The name of the disk to be restored.'),
  description: z.string().optional().describe('Optional. A description of the disk.'),
  labels: z.record(z.string()).optional().describe('Optional. Labels to apply to the disk.'),
  resourceManagerTags: z
    .record(z.string())
    .optional()
    .describe('Optional. Resource manager tags to apply to the disk.'),
  diskEncryptionKey: customerEncryptionKeySchema
    .optional()
    .describe('Optional. Encrypts the disk using a customer-supplied encryption key.'),
  provisionedIops: z.string().optional().describe('Optional. IOPS to provision for the disk.'),
  provisionedThroughput: z
    .string()
    .optional()
    .describe('Optional. Throughput to provision for the disk.'),
});

const diskTargetEnvironmentSchema = z.object({
  project: z.string().describe('Required. The project where the disk will be restored.'),
  zone: z.string().describe('Required. The zone where the disk will be restored.'),
});

const regionDiskTargetEnvironmentSchema = z.object({
  project: z.string().describe('Required. The project where the regional disk will be restored.'),
  region: z.string().describe('Required. The region where the regional disk will be restored.'),
  replicaZones: z
    .array(z.string())
    .optional()
    .describe('Optional. The replica zones for the regional disk.'),
});

// --- Main Restore Schema ---

const inputSchema = {
  name: z
    .string()
    .describe(
      'Required. The resource name of the Backup instance, in the format ' +
        'projects/{project}/locations/{location}/backupVaults/{backupVault}/dataSources/{dataSource}/backups/{backup}',
    ),
  requestId: z
    .string()
    .optional()
    .describe('Optional. An optional request ID to identify requests.'),

  // Target Environment Union
  computeInstanceTargetEnvironment: computeInstanceTargetEnvironmentSchema
    .optional()
    .describe('Optional. Target environment for restoring a Compute Engine instance.'),
  diskTargetEnvironment: diskTargetEnvironmentSchema
    .optional()
    .describe('Optional. Target environment for restoring a Disk.'),
  regionDiskTargetEnvironment: regionDiskTargetEnvironmentSchema
    .optional()
    .describe('Optional. Target environment for restoring a Regional Disk.'),

  // Restore Properties Union
  computeInstanceRestoreProperties: computeInstanceRestorePropertiesSchema
    .optional()
    .describe('Optional. Properties for restoring a Compute Engine instance.'),
  diskRestoreProperties: diskRestorePropertiesSchema
    .optional()
    .describe('Optional. Properties for restoring a Disk.'),
};

type RestoreBackupParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function restoreBackup(params: RestoreBackupParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('restoreBackup', params);
  try {
    const client = apiClientFactory.getBackupDRClient();

    // Construct the request object matching IRestoreBackupRequest
    const request: protos.google.cloud.backupdr.v1.IRestoreBackupRequest = {
      name: params.name,
      requestId: params.requestId ?? null,
      computeInstanceTargetEnvironment: params.computeInstanceTargetEnvironment
        ? {
            project: params.computeInstanceTargetEnvironment.project,
            zone: params.computeInstanceTargetEnvironment.zone,
          }
        : null,
      diskTargetEnvironment: params.diskTargetEnvironment
        ? {
            project: params.diskTargetEnvironment.project,
            zone: params.diskTargetEnvironment.zone,
          }
        : null,
      regionDiskTargetEnvironment: params.regionDiskTargetEnvironment
        ? {
            project: params.regionDiskTargetEnvironment.project,
            region: params.regionDiskTargetEnvironment.region,
            replicaZones: params.regionDiskTargetEnvironment.replicaZones ?? null,
          }
        : null,
      computeInstanceRestoreProperties: params.computeInstanceRestoreProperties
        ? {
            name: params.computeInstanceRestoreProperties.name,
            description: params.computeInstanceRestoreProperties.description ?? null,
            machineType: params.computeInstanceRestoreProperties.machineType ?? null,
            canIpForward: params.computeInstanceRestoreProperties.canIpForward ?? null,
            confidentialInstanceConfig: params.computeInstanceRestoreProperties
              .confidentialInstanceConfig
              ? {
                  enableConfidentialCompute:
                    params.computeInstanceRestoreProperties.confidentialInstanceConfig
                      .enableConfidentialCompute ?? null,
                }
              : null,
            deletionProtection: params.computeInstanceRestoreProperties.deletionProtection ?? null,
            disks:
              params.computeInstanceRestoreProperties.disks?.map((d) => ({
                deviceName: d.deviceName ?? null,
                source: d.source ?? null,
                diskSizeGb: d.diskSizeGb ?? null,
                diskType: d.diskType ?? null,
                diskInterface: d.diskInterface ?? null,
                provisionedIops: d.provisionedIops ?? null,
                provisionedThroughput: d.provisionedThroughput ?? null,
                resourcePolicies: d.resourcePolicies ?? null,
                diskEncryptionKey: d.diskEncryptionKey
                  ? {
                      rawKey: d.diskEncryptionKey.rawKey ?? null,
                      rsaEncryptedKey: d.diskEncryptionKey.rsaEncryptedKey ?? null,
                      kmsKeyName: d.diskEncryptionKey.kmsKeyName ?? null,
                      kmsKeyServiceAccount: d.diskEncryptionKey.kmsKeyServiceAccount ?? null,
                    }
                  : null,
                guestOsFeatures: d.guestOsFeatures?.map((g) => ({ type: g.type ?? null })) ?? null,
              })) ?? null,
            displayDevice: params.computeInstanceRestoreProperties.displayDevice
              ? {
                  enableDisplay:
                    params.computeInstanceRestoreProperties.displayDevice.enableDisplay ?? null,
                }
              : null,
            guestAccelerators:
              params.computeInstanceRestoreProperties.guestAccelerators?.map((g) => ({
                acceleratorType: g.acceleratorType ?? null,
                acceleratorCount: g.acceleratorCount ?? null,
              })) ?? null,
            labels: params.computeInstanceRestoreProperties.labels ?? null,
            metadata: params.computeInstanceRestoreProperties.metadata ?? null,
            minCpuPlatform: params.computeInstanceRestoreProperties.minCpuPlatform ?? null,
            networkInterfaces:
              params.computeInstanceRestoreProperties.networkInterfaces?.map((n) => ({
                network: n.network ?? null,
                subnetwork: n.subnetwork ?? null,
                networkIp: n.networkIp ?? null,
                internalIpv6Prefix: n.internalIpv6Prefix ?? null,
                accessConfigs:
                  n.accessConfigs?.map((a) => ({
                    type: a.type ?? null,
                    name: a.name ?? null,
                    natIp: a.natIp ?? null,
                    networkTier: a.networkTier ?? null,
                  })) ?? null,
                aliasIpRanges:
                  n.aliasIpRanges?.map((a) => ({
                    ipCidrRange: a.ipCidrRange ?? null,
                    subnetworkRangeName: a.subnetworkRangeName ?? null,
                  })) ?? null,
                stackType: n.stackType ?? null,
                nicType: n.nicType ?? null,
              })) ?? null,
            scheduling: params.computeInstanceRestoreProperties.scheduling
              ? {
                  onHostMaintenance:
                    params.computeInstanceRestoreProperties.scheduling.onHostMaintenance ?? null,
                  automaticRestart:
                    params.computeInstanceRestoreProperties.scheduling.automaticRestart ?? null,
                  preemptible:
                    params.computeInstanceRestoreProperties.scheduling.preemptible ?? null,
                  provisioningModel:
                    params.computeInstanceRestoreProperties.scheduling.provisioningModel ?? null,
                  instanceTerminationAction:
                    params.computeInstanceRestoreProperties.scheduling.instanceTerminationAction ??
                    null,
                }
              : null,
            serviceAccounts:
              params.computeInstanceRestoreProperties.serviceAccounts?.map((s) => ({
                email: s.email ?? null,
                scopes: s.scopes ?? null,
              })) ?? null,
            tags: params.computeInstanceRestoreProperties.tags
              ? {
                  items: params.computeInstanceRestoreProperties.tags.items ?? null,
                }
              : null,
            advancedMachineFeatures: params.computeInstanceRestoreProperties.advancedMachineFeatures
              ? {
                  enableNestedVirtualization:
                    params.computeInstanceRestoreProperties.advancedMachineFeatures
                      .enableNestedVirtualization ?? null,
                  threadsPerCore:
                    params.computeInstanceRestoreProperties.advancedMachineFeatures
                      .threadsPerCore ?? null,
                  visibleCoreCount:
                    params.computeInstanceRestoreProperties.advancedMachineFeatures
                      .visibleCoreCount ?? null,
                }
              : null,
          }
        : null,
      diskRestoreProperties: params.diskRestoreProperties
        ? {
            name: params.diskRestoreProperties.name ?? null,
            description: params.diskRestoreProperties.description ?? null,
            labels: params.diskRestoreProperties.labels ?? null,
            resourceManagerTags: params.diskRestoreProperties.resourceManagerTags ?? null,
            diskEncryptionKey: params.diskRestoreProperties.diskEncryptionKey
              ? {
                  rawKey: params.diskRestoreProperties.diskEncryptionKey.rawKey ?? null,
                  rsaEncryptedKey:
                    params.diskRestoreProperties.diskEncryptionKey.rsaEncryptedKey ?? null,
                  kmsKeyName: params.diskRestoreProperties.diskEncryptionKey.kmsKeyName ?? null,
                  kmsKeyServiceAccount:
                    params.diskRestoreProperties.diskEncryptionKey.kmsKeyServiceAccount ?? null,
                }
              : null,
            provisionedIops: params.diskRestoreProperties.provisionedIops ?? null,
            provisionedThroughput: params.diskRestoreProperties.provisionedThroughput ?? null,
          }
        : null,
    };

    const [operation] = await client.restoreBackup(request);
    toolLogger.info('Restore operation started successfully.');
    await operation.promise();
    toolLogger.info('Restore operation finished.');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(operation.result, null, 2),
        },
      ],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Failed to restore backup:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
          }),
        },
      ],
    };
  }
}

export const registerRestoreBackupTool = (server: McpServer) => {
  server.registerTool(
    'restore_backup',
    {
      description:
        'Restores a Backup resource to a target environment. Supports Compute Instances and Disks.',
      inputSchema,
    },
    restoreBackup,
  );
};
