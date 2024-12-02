import { BuildOptions } from 'esbuild';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const config: BuildOptions = {
  tsconfig: join(__dirname, './tsconfig.build.json'),

  target: 'node22',
  platform: 'node',

  /**
   * Cannot use `esm` due to following error:
   * `Dynamic require of "path" is not supported`
   */
  format: 'cjs',

  /**
   * `@aws-sdk/*` is already bundled in AWS Lambda
   */
  external: ['@aws-sdk/*'],

  bundle: true,
  minify: true,

  sourcemap: true,
  sourcesContent: false,

  logLevel: 'info',

  loader: {
    '.graphql': 'text',
    /**
     * Excludes json from source map but keeps files separate
     * which if fine since it all gets bundled into zip
     */
    '.json': 'copy',
  },
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
};

export default config;
