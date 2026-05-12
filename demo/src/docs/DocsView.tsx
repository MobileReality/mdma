import { useState } from 'react';
import { Cli } from './sections/Cli.js';
import { COMPONENTS, ComponentPreview, Components } from './sections/Components.js';
import { Installation } from './sections/Installation.js';
import { Introduction } from './sections/Introduction.js';
import { Mcp } from './sections/Mcp.js';
import { PACKAGES, PackageDetail } from './sections/PackageDetail.js';
import { Packages } from './sections/Packages.js';
import { PromptMatrix } from './sections/PromptMatrix.js';
import { Integrations, INTEGRATIONS } from './sections/Integrations.js';
import { IntegrationLangchain } from './sections/IntegrationLangchain.js';
import { Usage } from './sections/Usage.js';
import { Validator } from './sections/Validator.js';

const INTEGRATION_COMPONENTS: Record<string, React.ComponentType> = {
  langchain: IntegrationLangchain,
};

interface Section {
  slug: string;
  label: string;
  component?: React.ComponentType;
}

const SECTIONS: Section[] = [
  { slug: 'introduction', label: 'Introduction', component: Introduction },
  { slug: 'packages', label: 'Packages' },
  { slug: 'installation', label: 'Installation', component: Installation },
  { slug: 'usage', label: 'Usage', component: Usage },
  { slug: 'integrations', label: 'Integrations' },
  { slug: 'components', label: 'Components' },
  { slug: 'validator', label: 'Validator', component: Validator },
  { slug: 'mcp', label: 'MCP & Skills', component: Mcp },
  { slug: 'cli', label: 'CLI', component: Cli },
  { slug: 'prompt-matrix', label: 'Prompt Matrix', component: PromptMatrix },
];

export function DocsView() {
  const [active, setActive] = useState('introduction');
  const [selectedComponent, setSelectedComponent] = useState('form');

  const showPreview = active === 'components';
  const previewEntry = COMPONENTS.find((c) => c.type === selectedComponent) ?? COMPONENTS[0];

  const isPackagesActive = active === 'packages' || active.startsWith('packages/');
  const activePackageSlug = active.startsWith('packages/') ? active.slice('packages/'.length) : null;
  const activePackage = activePackageSlug ? PACKAGES.find((p) => p.slug === activePackageSlug) : null;

  const isIntegrationsActive = active === 'integrations' || active.startsWith('integrations/');
  const activeIntegrationSlug = active.startsWith('integrations/') ? active.slice('integrations/'.length) : null;
  const ActiveIntegration = activeIntegrationSlug ? INTEGRATION_COMPONENTS[activeIntegrationSlug] : null;

  const section = SECTIONS.find((s) => s.slug === active);
  const SectionContent = section?.component ?? null;

  function renderContent() {
    if (showPreview) return <Components selected={selectedComponent} onSelect={setSelectedComponent} />;
    if (activePackage) return <PackageDetail pkg={activePackage} onNavigate={setActive} />;
    if (active === 'packages') return <Packages onNavigate={setActive} />;
    if (ActiveIntegration) return <ActiveIntegration />;
    if (active === 'integrations') return <Integrations onNavigate={setActive} />;
    if (SectionContent) return <SectionContent />;
    return null;
  }

  return (
    <div className={`docs-layout${showPreview ? ' docs-layout--with-preview' : ''}`}>
      <nav className="docs-nav">
        <div className="docs-nav-title">Documentation</div>
        {SECTIONS.map((s) => (
          <div key={s.slug}>
            <button
              type="button"
              className={`docs-nav-item${s.slug === active || (s.slug === 'packages' && isPackagesActive) || (s.slug === 'integrations' && isIntegrationsActive) ? ' docs-nav-item--active' : ''}`}
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
        ))}
      </nav>

      <main className="docs-content">{renderContent()}</main>

      {showPreview && (
        <aside className="docs-preview-panel">
          <ComponentPreview key={selectedComponent} entry={previewEntry} />
        </aside>
      )}
    </div>
  );
}
