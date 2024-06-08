import { execSync } from 'child_process';
import { mkdir, readFileSync, writeFileSync } from 'fs';
import path from 'path';

import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

interface PreTranspileOptions {
  replace?: Record<string, unknown>;
}

/**
 *
 * @param inputPath
 * @returns Transpiled JavaScript code as string
 */
function transpileTypeScript(
  inputPath: string,
  options: PreTranspileOptions = {}
): string {
  let sourceCode = readFileSync(inputPath, { encoding: 'utf-8' });

  if (options.replace) {
    for (const [searchValue, variable] of Object.entries(options.replace)) {
      const replaceValue: string =
        typeof variable === 'string' ? `'${variable}'` : String(variable);
      sourceCode = sourceCode.replaceAll(searchValue, replaceValue);
    }
  }

  const transpiledCode = transpileModule(sourceCode, {
    compilerOptions: {
      target: ScriptTarget.ES5,
      module: ModuleKind.CommonJS,
    },
  }).outputText;

  return transpiledCode;
}

/**
 *
 * @param inputPath
 * @returns Path to JavaScript file
 */
export function transpileTypeScriptAsFile(
  inputPath: string,
  options: PreTranspileOptions = {}
): string {
  const transpiledCode = transpileTypeScript(inputPath, options);

  const jsPathParsed = { ...path.parse(inputPath), base: '', ext: '.js' };

  const outPath = path.join(
    __dirname,
    'out',
    path.format({ name: jsPathParsed.name, ext: '.js' })
  );

  mkdir(path.dirname(outPath), { recursive: true }, (err) => {
    if (err) throw err;
  });
  writeFileSync(outPath, transpiledCode);

  // Hide eslint debug messages
  const tmpDebug = process.env.DEBUG;
  process.env.DEBUG = '';

  try {
    execSync(`npx eslint --no-ignore ${outPath}`, {
      stdio: 'inherit',
    });
  } catch (err) {
    process.exit(1);
  }
  process.env.DEBUG = tmpDebug;

  return outPath;
}
