# Production build

Use the SDK's canonical Module Federation build instead of maintaining a consumer webpack configuration:

```sh
npx inari-ui-ext build ./src/index.tsx --name my-inari-extension
```

Options:

- `entry` defaults to `./src/index.tsx`.
- `--name` is required and must equal the extension's registry name.
- `--out-dir` defaults to `dist`. Because the output directory is cleaned, it must not contain the project, entry, or tsconfig; use a dedicated artifact directory.

The command typechecks the entry graph through `ts-loader` and emits a production `remoteEntry.js` plus its required chunks. The exposed module is `./extension`; the webpack container is the same normalized name used by the console loader. `npm run typecheck` remains available as a separate project-wide check in the scaffold.

## Host-shared modules

The build marks these as singletons with no local fallback:

- `react`, including the automatic `react/jsx-runtime`
- `react-dom` and `react-dom/client`
- `react-router-dom`
- `zod`
- `@7k-inari/ui-plugin-sdk`

Do not bundle another copy. The console must provide the same modules; a missing provider is a deployment error, not a reason to enable a fallback. Build tests inspect webpack stats to ensure host modules are consumed from the share scope rather than embedded.

## Output and publication

`remoteEntry.js` is a deployment artifact, not an npm-distributed extension. Package it through the existing backend/OCI flow with checksums and signatures required by the platform. This command does not change UI-remote distribution, OCI references, or release policy.

## Migration from a custom build

1. Install `@7k-inari/ui-plugin-sdk` from npm (or test an exact `npm pack` tarball).
2. Set the extension script to `inari-ui-ext build ./src/index.tsx --name <registry-name>`.
3. Remove consumer-owned webpack configs and webpack/ts-loader direct dependencies.
4. Remove any postinstall that clones and builds the SDK. Published tarballs contain `dist`, the CLI, templates, harness shell, tokens, and all CLI runtime dependencies.

To verify the actual package flow, run `npm run verify:consumer` in the SDK repo. For an exact published artifact, run `npm run verify:consumer -- --package @7k-inari/ui-plugin-sdk@<version>`.
