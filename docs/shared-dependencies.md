# Shared dependencies (singleton contract)

The Inari host shell provides these as **singletons**. Remotes must treat them as externals and never bundle their own copy:

| Package | Provided by host | Remotes |
|---|---|---|
| `react` (>=18) | yes | peer dependency, external |
| `react-dom` (>=18) | yes | peer dependency, external |
| `react-router-dom` (v6) | yes | external |
| `zod` (>=3) | yes | external (shared validation state) |
| `@7k-inari/ui-plugin-sdk` | yes | external — always resolved against the host's version |

Everything else (component libraries, utilities) is bundled by the remote.

This SDK enforces the contract structurally: `react`, `react-dom`, and `zod` are `peerDependencies`; the tsup build marks them (plus `react-router-dom`) external; the dev harness aliases/dedupes them via Vite (`resolve.dedupe`) so the standalone shell and the extension share one copy. Extension templates must do the same in their production Module Federation config (`shared: { react: { singleton: true }, ... }`).
