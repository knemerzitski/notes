import { build as _build, BuildOptions } from 'esbuild';
import { readFileSync } from 'fs';
import { join } from 'path';

await build(readArgs());

export function build(options: Pick<BuildOptions, 'entryPoints' | 'outfile'>) {
  return _build({
    entryPoints: options.entryPoints,
    outfile: options.outfile,
    tsconfig: join(__dirname, 'tsconfig.build.json'),

    target: 'node18',
    platform: 'node',

    bundle: true,
    external: ['@aws-sdk/*'],
    minify: true,
    sourcemap: true,
    sourcesContent: false,

    loader: {
      '.graphql': 'text',
      // Excludes json from source map but keeps files separate
      // which if fine since it all gets bundled into zip
      '.json': 'copy',
    },
    logLevel: 'info',
    plugins: [
      {
        name: 'excludeNodeModulesFromSourceMaps',
        setup(build) {
          // Don't generate source maps for vendor javascript files
          build.onLoad({ filter: /node_modules.*(\.[cm]?[jt]sx?)$/ }, (args) => {
            return {
              contents:
                readFileSync(args.path, 'utf8') +
                '\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==',
              loader: 'default',
            };
          });
        },
      },
    ],
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
