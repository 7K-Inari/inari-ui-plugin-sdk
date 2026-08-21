import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom';
import {
  ApiClient,
  AuthProvider,
  TenantProvider,
  createTenantState,
  type CatalogItem,
  type Cluster,
  type InariExtension,
  type ResourceInstance,
  type TenantRef,
  useAuth,
  useTenant,
} from '@7k-inari/ui-plugin-sdk';

declare global {
  interface Window {
    __INARI_API_URL__: string;
    __INARI_EXTENSION_ENTRY__: string;
  }
}

const apiUrl = window.__INARI_API_URL__;

function ShellLayout(props: { extension: InariExtension; children: React.ReactNode }) {
  const tenant = useTenant();
  const auth = useAuth();
  const navSlots = props.extension.slots.filter((s) => s.kind === 'nav-item');
  return (
    <div style={{ display: 'flex', fontFamily: 'var(--inari-font, sans-serif)', minHeight: '100vh' }}>
      <aside style={{ width: 220, borderRight: '1px solid var(--inari-border, #ddd)', padding: 16 }}>
        <h1 style={{ fontSize: 18 }}>Inari (dev harness)</h1>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="tenant-switch">Tenant: </label>
          <select
            id="tenant-switch"
            value={tenant.current?.orgId ?? ''}
            onChange={(e) => tenant.switchTenant(e.target.value)}
          >
            {tenant.available.map((t: TenantRef) => (
              <option key={t.orgId} value={t.orgId}>
                {t.orgName}
              </option>
            ))}
          </select>
        </div>
        <nav>
          <div><Link to="/">Catalog</Link></div>
          <div><Link to="/clusters">Clusters</Link></div>
          <div><Link to="/resources">Resources</Link></div>
          {navSlots.map((s) => (
            <div key={s.name}>
              <Link to={(s.props as { path: string }).path}>
                {(s.props as { title: string }).title}
              </Link>
            </div>
          ))}
        </nav>
        <footer style={{ marginTop: 24, fontSize: 12, color: '#777' }}>
          {auth.principal?.displayName} · {props.extension.manifest.name}@{props.extension.manifest.version}
        </footer>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{props.children}</main>
    </div>
  );
}

function CatalogPage(props: { extension: InariExtension }) {
  const auth = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  useEffect(() => {
    new ApiClient({ baseUrl: apiUrl, getToken: auth.getToken }).listCatalogItems().then(setItems);
  }, [auth]);
  const cards = props.extension.slots.filter((s) => s.kind === 'catalog-card');
  return (
    <div>
      <h2>Catalog</h2>
      {items.map((item) => (
        <div key={item.id} style={{ border: '1px solid var(--inari-border, #ddd)', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <strong>{item.name}</strong> <small>{item.version}</small>
          <p>{item.description}</p>
          {cards.map((c) => {
            const C = c.component!;
            return <C key={c.name} catalogItem={item} />;
          })}
        </div>
      ))}
    </div>
  );
}

function ClustersPage() {
  const auth = useAuth();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  useEffect(() => {
    new ApiClient({ baseUrl: apiUrl, getToken: auth.getToken }).listClusters().then(setClusters);
  }, [auth]);
  return (
    <div>
      <h2>Clusters</h2>
      <ul>
        {clusters.map((c) => (
          <li key={c.id}>
            <Link to={`/clusters/${c.id}`}>{c.name}</Link> — {c.state}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClusterDetailPage(props: { extension: InariExtension }) {
  const { id } = useParams();
  const auth = useAuth();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  useEffect(() => {
    if (id) new ApiClient({ baseUrl: apiUrl, getToken: auth.getToken }).getCluster(id).then(setCluster);
  }, [auth, id]);
  const tabs = props.extension.slots.filter((s) => s.kind === 'cluster-tab');
  if (!cluster) return <p>Loading…</p>;
  return (
    <div>
      <h2>{cluster.name}</h2>
      <p>State: {cluster.state} · k8s {cluster.kubernetesVersion}</p>
      {tabs.map((t) => {
        const T = t.component!;
        return (
          <section key={t.name} style={{ borderTop: '1px solid #eee', marginTop: 16 }}>
            <h3>{(t.options as { title: string }).title}</h3>
            <T cluster={cluster} />
          </section>
        );
      })}
    </div>
  );
}

function ResourcesPage(props: { extension: InariExtension }) {
  const auth = useAuth();
  const [resources, setResources] = useState<ResourceInstance[]>([]);
  useEffect(() => {
    new ApiClient({ baseUrl: apiUrl, getToken: auth.getToken }).listResourceInstances().then(setResources);
  }, [auth]);
  const actions = props.extension.slots.filter((s) => s.kind === 'instance-action');
  return (
    <div>
      <h2>Resources</h2>
      {resources.map((r) => (
        <div key={r.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <strong>{r.name}</strong> — {r.health}
          <div>
            {actions.map((a) => (
              <button
                key={a.name}
                style={{ marginRight: 8 }}
                onClick={() => void (a.props as { run: (i: ResourceInstance) => void }).run(r)}
              >
                {(a.props as { label: string }).label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function App(props: { extension: InariExtension }) {
  const pageSlots = props.extension.slots.filter((s) => s.kind === 'page');
  const auth = useAuth();
  const tenant = useTenant();
  const [, setVersion] = useState(0);
  useEffect(() => tenant.onTenantChange(() => setVersion((v) => v + 1)), [tenant]);
  const context = useMemo(() => ({ auth, tenant }), [auth, tenant]);
  return (
    <ShellLayout extension={props.extension}>
      <Routes>
        <Route path="/" element={<CatalogPage extension={props.extension} />} />
        <Route path="/clusters" element={<ClustersPage />} />
        <Route path="/clusters/:id" element={<ClusterDetailPage extension={props.extension} />} />
        <Route path="/resources" element={<ResourcesPage extension={props.extension} />} />
        {pageSlots.map((p) => {
          const P = p.component!;
          return (
            <Route
              key={p.name}
              path={(p.options as { path: string }).path}
              element={<P context={context} />}
            />
          );
        })}
      </Routes>
    </ShellLayout>
  );
}

async function main() {
  const mod = await import(/* @vite-ignore */ window.__INARI_EXTENSION_ENTRY__);
  const extension: InariExtension = mod.default ?? mod.extension;
  if (!extension) throw new Error('extension entry must default-export or export `extension`');

  const tenants: TenantRef[] = await fetch(`${apiUrl}/api/v1/tenants`).then((r) => r.json());
  const tenantState = createTenantState(tenants);
  const authState = {
    principal: { subject: 'user:dev', displayName: 'Dev User', groups: ['tenant-acme/platform-team'] },
    getToken: () => 'dev-token',
  };

  createRoot(document.getElementById('root')!).render(
    <AuthProvider value={authState}>
      <TenantProvider value={tenantState}>
        <BrowserRouter>
          <App extension={extension} />
        </BrowserRouter>
      </TenantProvider>
    </AuthProvider>,
  );
}

void main();
