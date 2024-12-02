import { build, BuildOptions } from 'esbuild';
import config from '../esbuild.config';

await myBuild(readArgs());

export function myBuild(options: Pick<BuildOptions, 'entryPoints' | 'outfile'>) {
  return build({
    ...config,
    entryPoints: options.entryPoints,
    outfile: options.outfile,
  });
}

function readArgs() {
  const outFileIndex = process.argv.findIndex((value) => value === '--outfile');
  if (outFileIndex === -1) {
    throw new Error('Expected --outfile to be specified');
  }
  const outFile = process.argv[outFileIndex + 1];
  if (!outFile) {
    throw new Error('Expected --outfile to be specified');
  }

  const otherArgs = [
    ...process.argv.slice(2, outFileIndex),
    ...process.argv.slice(outFileIndex + 2),
  ];

  if (otherArgs.length === 0) {
    throw new Error('Expected at least one entryPoint to be specified');
  }

  return {
    outfile: outFile,
    entryPoints: otherArgs,
  };
}
