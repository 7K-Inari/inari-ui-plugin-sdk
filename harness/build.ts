import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import webpack, { type Configuration, type Stats } from 'webpack';
import { extensionContainerName } from '../src/host/remote-name.js';

export interface BuildExtensionOptions {
  entry?: string;
  name: string;
  outDir?: string;
  tsconfig?: string;
}

export interface BuildExtensionResult {
  containerName: string;
  outDir: string;
  stats: Stats;
}

export async function buildExtension(options: BuildExtensionOptions): Promise<BuildExtensionResult> {
  const containerName = extensionContainerName(options.name);
  const entry = resolve(process.cwd(), options.entry ?? './src/index.tsx');
  if (!existsSync(entry)) throw new Error(`extension entry not found: ${entry}`);
  const outDir = resolve(process.cwd(), options.outDir ?? 'dist');
  const tsconfig = resolve(process.cwd(), options.tsconfig ?? 'tsconfig.json');
  if (!existsSync(tsconfig)) throw new Error(`extension tsconfig not found: ${tsconfig}`);

  const require = createRequire(import.meta.url);
  const shared = {
    react: { singleton: true, requiredVersion: false, import: false },
    'react-dom': { singleton: true, requiredVersion: false, import: false },
    'react-dom/client': { singleton: true, requiredVersion: false, import: false },
    'react-router-dom': { singleton: true, requiredVersion: false, import: false },
    zod: { singleton: true, requiredVersion: false, import: false },
    '@7k-inari/ui-plugin-sdk': { singleton: true, requiredVersion: false, import: false },
  } as const;
  const config: Configuration = {
    entry,
    mode: 'production',
    devtool: false,
    output: { path: outDir, publicPath: 'auto', clean: true },
    resolve: { extensions: ['.tsx', '.ts', '.js'] },
    module: {
      rules: [{
        test: /\.tsx?$/,
        use: [{
          loader: require.resolve('ts-loader'),
          options: {
            configFile: tsconfig,
            onlyCompileBundledFiles: true,
            compilerOptions: { noEmit: false, declaration: false, declarationMap: false },
          },
        }],
        exclude: /node_modules/,
      }],
    },
    plugins: [
      new webpack.container.ModuleFederationPlugin({
        name: containerName,
        filename: 'remoteEntry.js',
        exposes: { './extension': entry },
        shared,
      }),
    ],
  };

  const stats = await compile(config);
  if (stats.hasErrors()) {
    throw new Error(`extension build failed:\n${stats.toString({
      colors: false,
      all: false,
      errors: true,
      errorDetails: true,
    })}`);
  }
  return { containerName, outDir, stats };
}

function compile(config: Configuration): Promise<Stats> {
  return new Promise((resolve, reject) => {
    webpack(config, (error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      if (!stats) {
        reject(new Error('extension build returned no webpack stats'));
        return;
      }
      resolve(stats);
    });
  });
}
