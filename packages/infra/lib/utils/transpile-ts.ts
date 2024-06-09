import { execSync } from 'child_process';
import { mkdir, readFileSync, writeFileSync } from 'fs';
import path from 'path';

import { TranspileOptions as _TranspileOptions, transpileModule } from 'typescript';

interface SourceOptions {
  replace?: Record<string, unknown>;
}

interface TranspileOptions {
  inFile: string;
  source?: SourceOptions;
  transpile: _TranspileOptions;
}

/**
 *
 * @param inputPath
 * @returns Transpiled JavaScript code as string
 */
export function transpileTypeScript(options: TranspileOptions): string {
  let sourceCode = readFileSync(options.inFile, { encoding: 'utf-8' });

  if (options.source?.replace) {
    for (const [searchValue, variable] of Object.entries(options.source.replace)) {
      const replaceValue: string =
        typeof variable === 'string' ? `'${variable}'` : String(variable);
      sourceCode = sourceCode.replaceAll(searchValue, replaceValue);
    }
  }

  const transpiledCode = transpileModule(sourceCode, options.transpile).outputText;

  return transpiledCode;
}

export interface TranspileOptionsAsFile extends TranspileOptions {
  inFile: string;
  outFile: string;
  source?: SourceOptions;
  transpile: _TranspileOptions;
}

/**
 * Transpilte typescript to javascript with options to replace text.
 * @param inputPath
 */
export function transpileTypeScriptToFile(options: TranspileOptionsAsFile) {
  const transpiledCode = transpileTypeScript(options);

  mkdir(path.dirname(options.outFile), { recursive: true }, (err) => {
    if (err) throw err;
  });
  writeFileSync(options.outFile, transpiledCode);
}

export function eslintFile(filePath: string) {
  // Hide eslint debug messages
  const tmpDebug = process.env.DEBUG;
  process.env.DEBUG = '';

  try {
    execSync(`npx eslint --no-ignore ${filePath}`, {
      stdio: 'inherit',
    });
  } catch (err) {
    process.exit(1);
  }
  process.env.DEBUG = tmpDebug;
}
