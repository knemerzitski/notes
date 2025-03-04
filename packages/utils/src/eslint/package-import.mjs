import path from 'node:path';
import ts from 'typescript';

/**
 *
 * @param {string} tsConfigPath
 * @param {string | undefined} relativePackagesDir
 * @returns {string[]}
 */
export function tsConfigIncludeFromPackagesDir(tsConfigPath, relativePackagesDir = '..') {
  const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile.bind(ts.sys));
  if (tsConfig.error) {
    console.error(tsConfig.error);
    throw new Error(tsConfig.error.messageText);
  }

  const projectPath = path.dirname(tsConfigPath);

  return tsConfig.config.include.map((p) =>
    dirnameFromPackagesDir(projectPath, relativePackagesDir, p)
  );
}

export function dirnameFromPackagesDir(
  projectPath,
  relativePackagesDir = '..',
  targetDir = '.'
) {
  return path.relative(path.join(projectPath, relativePackagesDir), targetDir);
}
