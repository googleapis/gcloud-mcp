#!/usr/bin/env node

/**
 * Copyright 2025 Google LLC
 * * ... (License header remains the same)
 */

import { build } from 'esbuild';

// Comprehensive list of Node.js built-in modules to externalize
const NODE_BUILT_INS = [
    // ... (All Node built-ins you added previously)
    'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 
    'domain', 'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'querystring', 
    'readline', 'repl', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util', 
    'v8', 'vm', 'worker_threads', 'zlib',
];

// FIX: Explicitly externalize the new large dependencies
const NEW_EXTERNAL_PACKAGES = [
    'express', 
    'cors',
    '@modelcontextprotocol/sdk/server/streamableHttp.js', // Also externalize MCP packages
    '@modelcontextprotocol/sdk/server/mcp.js', 
    '@modelcontextprotocol/sdk/server/stdio.js',
];

build({
    entryPoints: ['src/server.ts'],
    bundle: true,
    outfile: 'dist/bundle.js',
    platform: 'node',
    format: 'esm',
    // MERGE ALL EXTERNAL ARRAYS
    external: [
        'google-auth-library', 
        'googleapis', 
        ...NODE_BUILT_INS,
        ...NEW_EXTERNAL_PACKAGES,
    ],
}).catch(() => process.exit(1));