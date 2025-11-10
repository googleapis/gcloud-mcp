import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CloudSdkSettings {
 cloudSdkRootDir: string;
 cloudSdkPython: string;
 cloudSdkGsutilPython: string;
 cloudSdkPythonArgs: string;
 noWorkingPythonFound: boolean;
 /** Environment variables to use when spawning gcloud.py */
 env: {[key: string]: string|undefined};
}

export interface WindowsCloudSDKSettings {
    isWindowsPlatform: boolean;
    cloudSDKSettings: CloudSdkSettings | null;
}


export function runWhere(command: string, spawnEnv: {[key: string]: string|undefined}): string[] {
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
    
    const pythonCandidates = runWhere('python', spawnEnv);
    if (pythonCandidates.length > 0) {
        for (const candidate of pythonCandidates) {
            const version = getPythonVersion(candidate, spawnEnv);
            if (version && version.startsWith('3')) {
                return candidate;
         }
        }
    }   

    const python3Candidates = runWhere('python3', spawnEnv);
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


export function getCloudSDKSettings(
    currentEnv: NodeJS.ProcessEnv = process.env,
    scriptDir: string = __dirname,
): CloudSdkSettings {
    const env = {...currentEnv };
    let cloudSdkRootDir = env['CLOUDSDK_ROOT_DIR'] || '';
    if (!cloudSdkRootDir) {
        cloudSdkRootDir = path.resolve(scriptDir, '..');
    }
    const sdkBinPath = path.join(cloudSdkRootDir, 'bin', 'sdk');
    const newPath = `${sdkBinPath}${path.delimiter}${env['PATH'] || ''}`;
    const pythonHome = undefined;
    const spawnEnv: {[key: string]: string|undefined} = {
        ...env,
        PATH: newPath,
        PYTHONHOME: pythonHome,
    };
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
    // If not bundled Python is found, try to find a Python installatikon on windows
    if (!cloudSdkPython) {
        cloudSdkPython = findWindowsPythonPath(spawnEnv);
    }
    
    // Where always exist in a Windows Platform
    let noWorkingPythonFound = false;
    // Juggling check to hit null and undefined at the same time
    if (!getPythonVersion(cloudSdkPython, spawnEnv)) {
        noWorkingPythonFound = true;
    }
    // ? Not sure the point of this is
    let cloudSdkPythonSitePackages = env['CLOUDSDK_PYTHON_SITEPACKAGES'];
    if (cloudSdkPythonSitePackages === undefined) {
        if (env['VIRTUAL_ENV']) {
            cloudSdkPythonSitePackages = '1';
        } else {
            cloudSdkPythonSitePackages = '';
        }
    }

    let cloudSdkPythonArgs = env['CLOUDSDK_PYTHON_ARGS'] || '';
    const argsWithoutS = cloudSdkPythonArgs.replace('-S', '').trim();
    if (!cloudSdkPythonSitePackages) {
        // Site packages disabled
        if (!cloudSdkPythonArgs.includes('-S')) {
        cloudSdkPythonArgs = argsWithoutS ? `${argsWithoutS} -S` : '-S';
    }
    } else {
    // Site packages enabled
        cloudSdkPythonArgs = argsWithoutS;
    }

    const cloudSdkGsutilPython = env['CLOUDSDK_GSUTIL_PYTHON'] || cloudSdkPython;

    if (env['CLOUDSDK_ENCODING']) {
        spawnEnv['PYTHONIOENCODING'] = env['CLOUDSDK_ENCODING'];
    }
    return {
        cloudSdkRootDir,
        cloudSdkPython,
        cloudSdkGsutilPython,
        cloudSdkPythonArgs,
        noWorkingPythonFound,
        env: spawnEnv,
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