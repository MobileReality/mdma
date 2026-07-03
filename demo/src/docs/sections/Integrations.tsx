interface IntegrationsProps {
  onNavigate: (slug: string) => void;
}

const INTEGRATIONS = [
  {
    slug: 'langchain',
    label: 'LangChain.js',
    description: 'Use MDMA inside a LangChain chain or agent — backend Node.js service.',
  },
  {
    slug: 'ag-ui',
    label: 'AG-UI',
    description:
      'Stream MDMA over the AG-UI protocol and resume the agent run on user actions — human-in-the-loop.',
  },
];

export function Integrations({ onNavigate }: IntegrationsProps) {
  return (
    <>
      <h2>Integrations</h2>
      <p>
        MDMA is framework-agnostic. Any library or language that can call an LLM and pass a system
        prompt works — the guides below show concrete setups for popular frameworks.
      </p>
      <div className="docs-inprogress-list">
        {INTEGRATIONS.map(({ slug, label, description }) => (
          <button
            key={slug}
            type="button"
            className="docs-inprogress-item docs-packages-nav-link"
            onClick={() => onNavigate(`integrations/${slug}`)}
          >
            <span className="docs-inprogress-name">{label}</span>
            <span className="docs-inprogress-desc">{description}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export { INTEGRATIONS };
