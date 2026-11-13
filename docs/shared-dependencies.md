# Shared dependencies (singleton contract)

The Inari host shell provides these as **singletons**. Remotes must treat them as externals and never bundle their own copy:

| Package | Provided by host | Remotes |
| --- | --- | --- |
| `react` (>=18) | yes | peer dependency, host-shared, no fallback |
| `react-dom` (>=18), including `react-dom/client` | yes | peer dependency, host-shared, no fallback |
| `react-router-dom` (>=6) | yes | peer dependency, host-shared, no fallback |
| `zod` (>=3) | yes | peer dependency, host-shared validation state |
| `@7k-inari/ui-plugin-sdk` | yes | always resolved against the host's version, no fallback |

Everything else (component libraries, utilities) is bundled by the remote.

The canonical `inari-ui-ext build` enforces this contract with `singleton: true`, `requiredVersion: false`, and `import: false`. Its tests inspect webpack stats and reject bundled host modules. The dev harness aliases/dedupes the same modules via Vite so the standalone shell and extension also share one copy. Do not copy a custom Module Federation config into an extension repo.
