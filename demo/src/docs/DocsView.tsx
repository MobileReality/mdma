import { useEffect, useState } from 'react';
import { Cli } from './sections/Cli.js';
import { COMPONENTS, ComponentPreview, Components } from './sections/Components.js';
import { CustomPromptBestPractices } from './sections/CustomPromptBestPractices.js';
import { Installation } from './sections/Installation.js';
import { IntegrationAgui } from './sections/IntegrationAgui.js';
import { IntegrationLangchain } from './sections/IntegrationLangchain.js';
import { INTEGRATIONS, Integrations } from './sections/Integrations.js';
import { Introduction } from './sections/Introduction.js';
import { Mcp } from './sections/Mcp.js';
import { PACKAGES, PackageDetail } from './sections/PackageDetail.js';
import { Packages } from './sections/Packages.js';
import { PromptMatrix } from './sections/PromptMatrix.js';
import { ReactNative, ReactNativeSnack } from './sections/ReactNative.js';
import { ReactWeb } from './sections/ReactWeb.js';
import { Theming, ThemingPreview, ThemingProvider } from './sections/Theming.js';
import { Usage, UsageHydrationPreview } from './sections/Usage.js';
import { Validator } from './sections/Validator.js';

const INTEGRATION_COMPONENTS: Record<string, React.ComponentType> = {
  langchain: IntegrationLangchain,
  'ag-ui': IntegrationAgui,
};

interface Section {
  slug: string;
  label: string;
  component?: React.ComponentType;
}

const MAIN_SECTIONS: Section[] = [
  { slug: 'introduction', label: 'Introduction', component: Introduction },
  { slug: 'packages', label: 'Packages' },
  { slug: 'installation', label: 'Installation', component: Installation },
  { slug: 'usage', label: 'Usage', component: Usage },
  { slug: 'components', label: 'Components' },
  { slug: 'theming', label: 'Theming', component: Theming },
  { slug: 'validator', label: 'Validator', component: Validator },
  { slug: 'mcp', label: 'MCP & Skills', component: Mcp },
  { slug: 'cli', label: 'CLI', component: Cli },
  {
    slug: 'custom-prompt-best-practices',
    label: 'Custom Prompt Best Practices',
    component: CustomPromptBestPractices,
  },
  { slug: 'prompt-matrix', label: 'Prompt Matrix', component: PromptMatrix },
];

const INTEGRATION_SECTIONS: Section[] = INTEGRATIONS.map((i) => ({
  slug: `integrations/${i.slug}`,
  label: i.label,
}));

const RENDERER_SECTIONS: Section[] = [
  { slug: 'react', label: 'React', component: ReactWeb },
  { slug: 'react-native', label: 'React Native', component: ReactNative },
];

const SECTIONS: Section[] = [...MAIN_SECTIONS, ...INTEGRATION_SECTIONS, ...RENDERER_SECTIONS];

function getDocsSlug(): string {
  const hash = window.location.hash.slice(1); // e.g. /docs/packages/runtime
  const sub = hash.startsWith('/docs/') ? hash.slice('/docs/'.length) : '';
  return sub || 'introduction';
}

function navigateDocs(slug: string) {
  window.location.hash = `/docs/${slug}`;
}

export function DocsView() {
  const [active, setActiveState] = useState(getDocsSlug);
  const [selectedComponent, setSelectedComponent] = useState('form');
  const [usageExampleOpen, setUsageExampleOpen] = useState(false);

  useEffect(() => {
    function sync() {
      setActiveState(getDocsSlug());
    }
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  function setActive(slug: string) {
    navigateDocs(slug);
    setActiveState(slug);
  }

  const showComponentsPreview = active === 'components';
  const showUsagePreview = active === 'usage' && usageExampleOpen;
  const showRnPreview = active === 'react-native';
  const showThemingPreview = active === 'theming';
  const showPreview =
    showComponentsPreview || showUsagePreview || showRnPreview || showThemingPreview;
  const previewEntry = COMPONENTS.find((c) => c.type === selectedComponent) ?? COMPONENTS[0];

  const isPackagesActive = active === 'packages' || active.startsWith('packages/');
  const activePackageSlug = active.startsWith('packages/')
    ? active.slice('packages/'.length)
    : null;
  const activePackage = activePackageSlug
    ? PACKAGES.find((p) => p.slug === activePackageSlug)
    : null;

  const isIntegrationsActive = active === 'integrations' || active.startsWith('integrations/');
  const activeIntegrationSlug = active.startsWith('integrations/')
    ? active.slice('integrations/'.length)
    : null;
  const ActiveIntegration = activeIntegrationSlug
    ? INTEGRATION_COMPONENTS[activeIntegrationSlug]
    : null;

  const section = SECTIONS.find((s) => s.slug === active);
  const SectionContent = section?.component ?? null;

  function renderContent() {
    if (showComponentsPreview)
      return <Components selected={selectedComponent} onSelect={setSelectedComponent} />;
    if (active === 'usage')
      return (
        <Usage
          exampleOpen={usageExampleOpen}
          onToggleExample={() => setUsageExampleOpen((v) => !v)}
        />
      );
    if (activePackage) return <PackageDetail pkg={activePackage} onNavigate={setActive} />;
    if (active === 'packages') return <Packages onNavigate={setActive} />;
    if (ActiveIntegration) return <ActiveIntegration />;
    if (active === 'integrations') return <Integrations onNavigate={setActive} />;
    if (SectionContent) return <SectionContent />;
    return null;
  }

  const isNavActive = (s: Section) =>
    s.slug === active ||
    (s.slug === 'packages' && isPackagesActive) ||
    (s.slug === 'integrations' && isIntegrationsActive);

  const renderNavItem = (s: Section) => (
    <div key={s.slug}>
      <button
        type="button"
        className={`docs-nav-item${isNavActive(s) ? ' docs-nav-item--active' : ''}`}
        onClick={() => setActive(s.slug)}
      >
        {s.label}
      </button>

      {s.slug === 'packages' && isPackagesActive && (
        <div className="docs-nav-sub">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.slug}
              type="button"
              className={`docs-nav-sub-item${activePackageSlug === pkg.slug ? ' docs-nav-sub-item--active' : ''}`}
              onClick={() => setActive(`packages/${pkg.slug}`)}
            >
              {pkg.label}
            </button>
          ))}
        </div>
      )}

      {s.slug === 'integrations' && isIntegrationsActive && (
        <div className="docs-nav-sub">
          {INTEGRATIONS.map((integration) => (
            <button
              key={integration.slug}
              type="button"
              className={`docs-nav-sub-item${activeIntegrationSlug === integration.slug ? ' docs-nav-sub-item--active' : ''}`}
              onClick={() => setActive(`integrations/${integration.slug}`)}
            >
              {integration.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <ThemingProvider>
      <div
        className={`docs-layout${showPreview ? ' docs-layout--with-preview' : ''}${
          showRnPreview ? ' docs-layout--rn' : ''
        }`}
      >
        <nav className="docs-nav">
          <div className="docs-nav-title">Documentation</div>
          {MAIN_SECTIONS.map(renderNavItem)}
          <div className="docs-nav-title docs-nav-title--group">Integrations</div>
          {INTEGRATION_SECTIONS.map(renderNavItem)}
          <div className="docs-nav-title docs-nav-title--group">Renderers</div>
          {RENDERER_SECTIONS.map(renderNavItem)}
        </nav>

        <main className="docs-content">{renderContent()}</main>

        {showPreview && (
          <aside className="docs-preview-panel">
            {showComponentsPreview ? (
              <ComponentPreview key={selectedComponent} entry={previewEntry} />
            ) : showRnPreview ? (
              <ReactNativeSnack />
            ) : showThemingPreview ? (
              <ThemingPreview />
            ) : (
              <UsageHydrationPreview />
            )}
          </aside>
        )}
      </div>
    </ThemingProvider>
  );
}
