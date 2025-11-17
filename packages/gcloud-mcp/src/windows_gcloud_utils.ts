import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// import { log } from './utility/logger.js';

export interface CloudSdkSettings {
 cloudSdkRootDir: string;
 cloudSdkPython: string;
 cloudSdkPythonArgs: string;
 noWorkingPythonFound: boolean;
 /** Environment variables to use when spawning gcloud.py */
 env: {[key: string]: string|undefined};
}

export interface WindowsCloudSDKSettings {
    isWindowsPlatform: boolean;
    cloudSDKSettings: CloudSdkSettings | null;
}


export function execWhere(command: string, spawnEnv: {[key: string]: string|undefined}): string[] {
    try {
        const result = child_process
                            .execSync(`where ${command}`, {
                                encoding: 'utf8',
                                stdio: ['pipe', 'pipe', 'ignore'],
                                env: spawnEnv,  // Use updated PATH for where command
                            })
                            .trim();
        return result.split(/\r?\n/).filter(line => line.length > 0);
    } catch (e) {
        return [];
    }
}

export function getPythonVersion(pythonPath: string, spawnEnv: {[key: string]: string|undefined}): string | undefined {
    try {
        const escapedPath =
            pythonPath.includes(' ') ? `"${pythonPath}"` : pythonPath;
        const cmd = `${escapedPath} -c "import sys; print(sys.version)"`;
        const result = child_process
                            .execSync(cmd, {
                                encoding: 'utf8',
                                stdio: ['pipe', 'pipe', 'ignore'],
                                env: spawnEnv,  // Use env without PYTHONHOME
                            })
                            .trim();
        return result.split(/[\r\n]+/)[0];
   } catch (e) {
     return undefined;
   }
}

export function findWindowsPythonPath(spawnEnv: {[key: string]: string|undefined}): string {
    // Try to find a Python installation on Windows
    // Try Python, python3, python2
    
    const pythonCandidates = execWhere('python', spawnEnv);
    if (pythonCandidates.length > 0) {
        for (const candidate of pythonCandidates) {
            const version = getPythonVersion(candidate, spawnEnv);
            if (version && version.startsWith('3')) {
                return candidate;
         }
        }
    }   

    const python3Candidates = execWhere('python3', spawnEnv);
    if (python3Candidates.length > 0) {
        for (const candidate of python3Candidates) {
            const version = getPythonVersion(candidate, spawnEnv);
            if (version && version.startsWith('3')) {
                return candidate;
         }
        }
    }

    // Try to find python2 last
    if (pythonCandidates.length > 0) {
        for (const candidate of pythonCandidates) {
            const version = getPythonVersion(candidate, spawnEnv);
            if (version && version.startsWith('2')) {
                return candidate;
            }
        }
    } 
    return "python.exe"; // Fallback to default python command
}

export function getSDKRootDirectory(env: NodeJS.ProcessEnv): string {
    let cloudSdkRootDir = env['CLOUDSDK_ROOT_DIR'] || '';
    if (cloudSdkRootDir) {
        return cloudSdkRootDir;
    }

    try {
        // Use 'where gcloud' to find the gcloud executable on Windows
        const gcloudPathOutput = child_process.execSync('where gcloud', { encoding: 'utf8', env: env }).trim();
        const gcloudPath = gcloudPathOutput.split(/\r?\n/)[0]; // Take the first path if multiple are returned

        if (gcloudPath) {
            // Assuming gcloud.cmd is in <SDK_ROOT>/bin/gcloud.cmd
            // We need to go up two levels from the gcloud.cmd path
            const binDir = path.dirname(gcloudPath);
            const sdkRoot = path.dirname(binDir);
            return sdkRoot;
        }
    } catch (e) {
        // gcloud not found in PATH, or other error
        console.warn('gcloud not found in PATH. Please ensure Google Cloud SDK is installed and configured.');
    }

    return ''; // Return empty string if not found
}

export function getCloudSDKSettings(
    currentEnv: NodeJS.ProcessEnv = process.env,
): CloudSdkSettings {
    const env = {...currentEnv };
    let cloudSdkRootDir = getSDKRootDirectory(env);

    let cloudSdkPython = env['CLOUDSDK_PYTHON'] || '';
    // Find bundled python if no python is set in the environment.
    if (!cloudSdkPython) {
        const bundledPython = path.join(
            cloudSdkRootDir,
            'platform',
            'bundledpython',
            'python.exe',
        );
        if (fs.existsSync(bundledPython)) {
            cloudSdkPython = bundledPython;
        }
    }
    // If not bundled Python is found, try to find a Python installation on windows
    if (!cloudSdkPython) {
        cloudSdkPython = findWindowsPythonPath(env);
    }
    
    // Where always exist in a Windows Platform
    let noWorkingPythonFound = false;
    // Juggling check to hit null and undefined at the same time
    if (!getPythonVersion(cloudSdkPython, env)) {
        noWorkingPythonFound = true;
    }

    // Check if the User has site package enabled
    let cloudSdkPythonSitePackages = env['CLOUDSDK_PYTHON_SITEPACKAGES'] || '';
    if (cloudSdkPythonSitePackages === undefined) {
        if (env['VIRTUAL_ENV']) {
            cloudSdkPythonSitePackages = '1';
        } else {
            cloudSdkPythonSitePackages = '';
        }
    }

    let cloudSdkPythonArgs = env['CLOUDSDK_PYTHON_ARGS'] || '';
    const argsWithoutS = cloudSdkPythonArgs.replace('-S', '').trim();

    // Spacing here matters
    cloudSdkPythonArgs = !cloudSdkPythonSitePackages ? `${argsWithoutS}-S` : argsWithoutS;

    return {
        cloudSdkRootDir,
        cloudSdkPython,
        cloudSdkPythonArgs,
        noWorkingPythonFound,
        env: env,
    };
}

export function getWindowsCloudSDKSettings() : WindowsCloudSDKSettings {
    const isWindowsPlatform = os.platform() === 'win32';
    if (isWindowsPlatform) {
        return {
            isWindowsPlatform: true,
            cloudSDKSettings: getCloudSDKSettings(),
        };
    }
    else {
        return {
            isWindowsPlatform: false,
            cloudSDKSettings: null
        }
    }
}

export function getGcloudLibPath(cloudSdkRootDir: string) : string {
    return path.join(cloudSdkRootDir, 'lib', 'gcloud');
}
