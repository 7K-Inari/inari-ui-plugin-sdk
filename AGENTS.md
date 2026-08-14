# inari-ui-plugin-sdk — Agent Guide

TypeScript SDK for Inari UI extensions: extension-point blueprints, host APIs, dev harness to run an extension standalone against a dev control plane (plan §6 #7, §5.8, §8.4).

Stack: TypeScript, npm package

## Key architecture constraints
- **Blueprint/extension-point contract**, not free-form rendering — typed slots: `NavItemBlueprint`, `CatalogCardBlueprint`, `ClusterTabBlueprint`, `InstanceActionBlueprint`, `FormWidgetBlueprint`, `PageBlueprint` (§5.8, §8.4).
- Shared React singletons; remotes registered at runtime via Module Federation (`remoteEntry.js` served via backend/OCI) (§5.8).
- Design tokens live here; dev harness runs a remote standalone with a mocked control plane (§8.1).

## Conventions
- Conventional Commits; SemVer releases; container images/artifacts cosign-signed (once CI exists).
- Write tests for new behavior; keep changes minimal and focused.
- Releases are automated with release-please in **PR-only mode**:
  1. `release-please.yml` (on push to `main`) opens/updates a "chore: release X.Y.Z" PR that bumps `package.json` and updates `CHANGELOG.md` (`skip-github-release: true` — no tags/releases from release-please itself).
  2. A human merges the Release PR.
  3. `release.yml` (on push to `main`) detects the release merge, creates the `vX.Y.Z` tag and GitHub Release from the CHANGELOG notes, then publishes the package to npm at the bumped version. Never trigger publishes from tag-push workflows.
- Requires the `NPM_TOKEN` repo secret (npm publish) and Conventional Commits on `main` to drive semver bumps.
- Canonical architecture & development plan: https://github.com/7K-Inari/inari-docs/blob/main/docs/architecture/inari-platform-plan.md (section references below point into it).

## Platform design principles (apply everywhere)
1. Tenant-aware to the core — every object carries a tenant ID; every API decision is tenant-scoped.
2. Zero tenant credentials on the hub — no tenant kubeconfigs or cloud keys in the control plane.
3. Pull, never push — agents dial out; the control plane never initiates connections into tenant networks.
4. Desired state, eventually reconciled — GitOps/CR-based mutations, not imperative RPCs.
5. The catalog is a projection of reality — capabilities are discovered, not declared.
6. Small kernel, everything else extension.
7. Modular monolith first — strict internal module boundaries.
