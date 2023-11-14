import { resolve } from 'path';

// import ForkTsCheckerPlugin from 'fork-ts-checker-webpack-plugin';
import NodemonPlugin from 'nodemon-webpack-plugin';
import { Configuration, SourceMapDevToolPlugin } from 'webpack';

const config: Configuration = {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  entry: resolve(__dirname, './src/index.ts'),
  cache: {
    type: 'filesystem',
  },
  output: {
    filename: '[name].js',
    path: resolve(__dirname, './dist'),
    pathinfo: false,
  },
  target: 'node',
  optimization: {
    runtimeChunk: true,
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false,
    nodeEnv: false,
  },
  stats: 'errors-only',
  module: {
    rules: [
      {
        test: /\.graphql$/i,
        use: 'raw-loader',
      },
      {
        test: /\.(js|ts)?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'ts',
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new SourceMapDevToolPlugin({
      filename: '[name].js.map',
    }),
    // new ForkTsCheckerPlugin({
    //   typescript: {
    //     memoryLimit: 512,
    //   }
    // }),
    new NodemonPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
    },
    extensions: ['.tsx', '.ts', '.mjs', '.js', '.json', '.graphql'],
  },
};

export default config;
