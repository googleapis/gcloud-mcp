import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  execWhere,
  getPythonVersion,
  findWindowsPythonPath,
  getSDKRootDirectory,
  getWindowsCloudSDKSettings,
  getCloudSDKSettings,
} from './windows_gcloud_utils.js';

vi.mock('child_process');
vi.mock('fs');
vi.mock('os');

describe('windows_gcloud_utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('execWhere', () => {
    it('should return paths when command is found', () => {
      vi.spyOn(child_process, 'execSync').mockReturnValue('C:\\Program Files\\Python\\Python39\\python.exe\nC:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python38\\python.exe');
      const result = execWhere('command', {});
      expect(result).toEqual(['C:\\Program Files\\Python\\Python39\\python.exe', 'C:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python38\\python.exe'].map(p => path.win32.normalize(p)));
    });

    it('should return empty array when command is not found', () => {
      vi.spyOn(child_process, 'execSync').mockImplementation(() => {
        throw new Error();
      });
      const result = execWhere('command', {});
      expect(result).toEqual([]);
    });
  });

  describe('getPythonVersion', () => {
    it('should return python version', () => {
      vi.spyOn(child_process, 'execSync').mockReturnValue('3.9.0');
      const version = getPythonVersion('python', {});
      expect(version).toBe('3.9.0');
    });

    it('should return undefined if python not found', () => {
      vi.spyOn(child_process, 'execSync').mockImplementation(() => {
        throw new Error();
      });
      const version = getPythonVersion('python', {});
      expect(version).toBeUndefined();
    });
  });

  describe('findWindowsPythonPath', () => {
    it('should find python3 when multiple python versions are present', () => {
      // Mock `execWhere('python', ...)` to return a list of python paths
      vi.spyOn(child_process, 'execSync')
        .mockReturnValueOnce(
          'C:\\Python27\\python.exe\nC:\\Python39\\python.exe'
        ) // For execWhere('python')
        .mockReturnValueOnce('2.7.18') // For getPythonVersion('C:\\Python27\\python.exe')
        .mockReturnValueOnce('3.9.5') // For getPythonVersion('C:\\Python39\\python.exe')
        .mockReturnValueOnce(''); // For execWhere('python3') - no python3 found

      const pythonPath = findWindowsPythonPath({});
      expect(pythonPath).toBe('C:\\Python39\\python.exe');
    });

    it('should find python2 if no python3 is available', () => {
      // Mock `execWhere('python', ...)` to return a list of python paths
      vi.spyOn(child_process, 'execSync')
        .mockReturnValueOnce(
          'C:\\Python27\\python.exe'
        ) // For execWhere('python')
        .mockReturnValueOnce('2.7.18') // For getPythonVersion('C:\\Python27\\python.exe')
        .mockReturnValueOnce('') // For execWhere('python3') - no python3 found
        .mockReturnValueOnce('2.7.18'); // For getPythonVersion('C:\\Python27\\python.exe') - second check for python2

      const pythonPath = findWindowsPythonPath({});
      expect(pythonPath).toBe('C:\\Python27\\python.exe');
    });

    it('should return default python.exe if no python is found', () => {
      vi.spyOn(child_process, 'execSync').mockReturnValueOnce(''); // For execWhere('python')
      vi.spyOn(child_process, 'execSync').mockReturnValueOnce(''); // For execWhere('python3')
      const pythonPath = findWindowsPythonPath({});
      expect(pythonPath).toBe('python.exe');
    });
  });

  describe('getSDKRootDirectory', () => {
    it('should get root directory from CLOUDSDK_ROOT_DIR', () => {
      const sdkRoot = getSDKRootDirectory({ CLOUDSDK_ROOT_DIR: 'sdk_root' });
      expect(sdkRoot).toBe(path.win32.normalize('sdk_root'));
    });

    it('should get root directory from where gcloud', () => {
      vi.spyOn(child_process, 'execSync').mockReturnValue('C:\\Program Files\\Google\\Cloud SDK\\bin\\gcloud.cmd');
      const sdkRoot = getSDKRootDirectory({});
      expect(sdkRoot).toBe(path.win32.normalize('C:\\Program Files\\Google\\Cloud SDK'));
    });

    it('should return empty string if gcloud not found', () => {
      vi.spyOn(child_process, 'execSync').mockImplementation(() => {
        throw new Error('gcloud not found');
      });
      const sdkRoot = getSDKRootDirectory({});
      expect(sdkRoot).toBe('');
    });
  });

  describe('getWindowsCloudSDKSettings', () => {
    it('should get settings with bundled python', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(child_process, 'execSync').mockReturnValue('3.9.0'); // For getPythonVersion

      const settings = getWindowsCloudSDKSettings({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON_SITEPACKAGES: '' // no site packages
      });

      expect(settings.cloudSdkRootDir).toBe(path.win32.normalize('C:\\CloudSDK'));
      expect(settings.cloudSdkPython).toBe(path.win32.normalize('C:\\CloudSDK\\platform\\bundledpython\\python.exe'));
      expect(settings.cloudSdkPythonArgs).toBe('-S'); // Expect -S to be added
      expect(settings.noWorkingPythonFound).toBe(false);
    });

    it('should get settings with CLOUDSDK_PYTHON and site packages enabled', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false); // No bundled python
      vi.spyOn(child_process, 'execSync').mockReturnValue('3.9.0'); // For getPythonVersion

      const settings = getWindowsCloudSDKSettings({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON: 'C:\\Python39\\python.exe',
        CLOUDSDK_PYTHON_SITEPACKAGES: '1',
      });

      expect(settings.cloudSdkRootDir).toBe(path.win32.normalize('C:\\CloudSDK'));
      expect(settings.cloudSdkPython).toBe('C:\\Python39\\python.exe');
      expect(settings.cloudSdkPythonArgs).toBe(''); // Expect no -S
      expect(settings.noWorkingPythonFound).toBe(false);
    });

    it('should set noWorkingPythonFound to true if python version cannot be determined', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false); // No bundled python
      vi.spyOn(child_process, 'execSync').mockImplementation(() => {
        throw new Error();
      }); // getPythonVersion throws

      const settings = getWindowsCloudSDKSettings({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON: 'C:\\NonExistentPython\\python.exe',
      });

      expect(settings.noWorkingPythonFound).toBe(true);
    });

    it('should handle VIRTUAL_ENV for site packages', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      vi.spyOn(child_process, 'execSync').mockReturnValue('3.9.0');

      const settings = getWindowsCloudSDKSettings({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON: 'C:\\Python39\\python.exe', // Explicitly set python to avoid findWindowsPythonPath
        VIRTUAL_ENV: 'C:\\MyVirtualEnv',
        CLOUDSDK_PYTHON_SITEPACKAGES: undefined, // Ensure this is undefined to hit the if condition
      });
      expect(settings.cloudSdkPythonArgs).toBe('');
    });

    it('should keep existing CLOUDSDK_PYTHON_ARGS and add -S if no site packages', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(child_process, 'execSync').mockReturnValue('3.9.0');

      const settings = getWindowsCloudSDKSettings({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON_ARGS: '-v',
        CLOUDSDK_PYTHON_SITEPACKAGES: ''
      });
      expect(settings.cloudSdkPythonArgs).toBe('-v -S');
    });

    it('should remove -S from CLOUDSDK_PYTHON_ARGS if site packages enabled', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(child_process, 'execSync').mockReturnValue('3.9.0');

      const settings = getWindowsCloudSDKSettings({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON_ARGS: '-v -S',
        CLOUDSDK_PYTHON_SITEPACKAGES: '1'
      });
      expect(settings.cloudSdkPythonArgs).toBe('-v');
    });
  });

  describe('getCloudSDKSettings', () => {
    it('should return windows settings on windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      vi.spyOn(child_process, 'execSync').mockReturnValue('3.9.0');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const settings = getCloudSDKSettings();
      expect(settings.isWindowsPlatform).toBe(true);
      expect(settings.windowsCloudSDKSettings).not.toBeNull();
      expect(settings.windowsCloudSDKSettings?.noWorkingPythonFound).toBe(false);
    });

    it('should not return windows settings on other platforms', () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      const settings = getCloudSDKSettings();
      expect(settings.isWindowsPlatform).toBe(false);
      expect(settings.windowsCloudSDKSettings).toBeNull();
    });
  });
});
