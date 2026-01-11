#!/usr/bin/env node
/**
 * Install Native Messaging Manifest
 *
 * Creates manifest file and symlinks for Chrome/Chromium to discover the native host.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NATIVE_HOST_NAME = 'com.irisgo.pulsar';
const EXTENSION_ID = 'YOUR_EXTENSION_ID'; // Update after extension is published

function getManifestPath() {
  const platform = os.platform();

  if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library/Application Support/Google/Chrome/NativeMessagingHosts'
    );
  } else if (platform === 'win32') {
    return path.join(
      os.homedir(),
      'AppData/Local/Google/Chrome/User Data/NativeMessagingHosts'
    );
  } else if (platform === 'linux') {
    return path.join(
      os.homedir(),
      '.config/google-chrome/NativeMessagingHosts'
    );
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function getHostPath() {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // Development: point to source file
    return path.join(__dirname, '../dist/native-messaging/host.js');
  } else {
    // Production: point to bundled executable
    if (os.platform() === 'darwin') {
      return '/Applications/Pulsar.app/Contents/MacOS/native-host';
    } else if (os.platform() === 'win32') {
      return 'C:\\Program Files\\Pulsar\\native-host.exe';
    } else {
      return '/usr/local/bin/pulsar-native-host';
    }
  }
}

function createManifest() {
  const manifest = {
    name: NATIVE_HOST_NAME,
    description: 'Pulsar Native Messaging Host',
    path: getHostPath(),
    type: 'stdio',
    allowed_origins: [
      `chrome-extension://${EXTENSION_ID}/`
    ]
  };

  return JSON.stringify(manifest, null, 2);
}

function install() {
  try {
    console.log('Installing Native Messaging manifest...');

    const manifestDir = getManifestPath();
    const manifestFile = path.join(manifestDir, `${NATIVE_HOST_NAME}.json`);

    // Create directory if not exists
    if (!fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
    }

    // Write manifest
    const manifestContent = createManifest();
    fs.writeFileSync(manifestFile, manifestContent);

    console.log(`✅ Manifest installed at: ${manifestFile}`);
    console.log(`Host path: ${getHostPath()}`);
    console.log('');
    console.log('⚠️  Remember to update EXTENSION_ID in this script after publishing the extension!');

  } catch (error) {
    console.error('❌ Failed to install manifest:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === __filename) {
  install();
}

export { install };
