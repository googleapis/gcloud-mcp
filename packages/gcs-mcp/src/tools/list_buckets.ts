import {Storage, Bucket} from '@google-cloud/storage';

// Create a GCS client
const storage = new Storage();

// Define the tool
export const listBucketsTool = {
  toolSpec: {
    name: 'list_gcs_buckets',
    description: 'Lists all GCS buckets in the project.',
    inputSchema: {},
  },
  toolExecutor: async () => {
    const [buckets] = await storage.getBuckets();
    if (buckets.length === 0) {
      return { content: [{ type: 'text', text: 'No buckets found.' }] };
    }
    const bucketNames = buckets.map((bucket: Bucket) => bucket.name);
    return { content: [{ type: 'text', text: bucketNames.join('\n') }] };
  },
};
