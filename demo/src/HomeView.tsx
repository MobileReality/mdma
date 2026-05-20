const DOCS_ITEM = {
  path: '/docs',
  label: 'Docs',
  icon: '📖',
  description:
    'Browse the full MDMA documentation — components, packages, validator rules, MCP server, prompt matrix, and more.',
};

const SECTIONS = [
  {
    label: 'Agentic',
    description: 'Agent with tool use',
    items: [
      {
        path: '/chat',
        label: 'Agent Chat',
        icon: '⚡',
        description:
          'Autonomous agent that thinks, plans, and generates interactive MDMA documents via tool calls.',
      },
      {
        path: '/preview',
        label: 'Insurance Preview',
        icon: '🛡️',
        description:
          'Multi-step insurance claim flow demo — chat on the left, live MDMA preview with auto-validation and fixer on the right.',
      },
    ],
  },
  {
    label: 'Completions',
    description: 'Direct LLM-to-document generation',
    items: [
      {
        path: '/author',
        label: 'MDMA Chat',
        icon: '✍️',
        description:
          'Chat directly with an LLM that outputs MDMA documents in a single completion.',
      },
      {
        path: '/custom',
        label: 'Custom Components',
        icon: '🎨',
        description:
          'Same as MDMA Chat but with custom-styled form elements, charts, and extended component types.',
      },
    ],
  },
  {
    label: 'Tools',
    description: 'Development utilities',
    items: [
      {
        path: '/validator',
        label: 'Validator',
        icon: '🔍',
        description: 'Validates generated MDMA format against the spec schema in real time.',
      },
    ],
  },
];

function navigate(to: string) {
  window.location.hash = to;
}

export function HomeView() {
  return (
    <div className="home-view">
      <div className="home-hero">
        <h2 className="home-hero-title">MDMA</h2>
        <p className="home-hero-sub">The open standard for AI-generated interactive UI</p>
      </div>

      <div className="home-sections">
        <button
          type="button"
          className="home-card home-card--featured"
          onClick={() => navigate(DOCS_ITEM.path)}
        >
          <span className="home-card-icon">{DOCS_ITEM.icon}</span>
          <div className="home-card-featured-body">
            <span className="home-card-label">{DOCS_ITEM.label}</span>
            <span className="home-card-desc">{DOCS_ITEM.description}</span>
          </div>
        </button>

        {SECTIONS.map((section) => (
          <div key={section.label} className="home-section">
            <div className="home-section-header">
              <span className="home-section-label">{section.label}</span>
              <span className="home-section-desc">{section.description}</span>
            </div>
            <div className="home-cards">
              {section.items.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="home-card"
                  onClick={() => navigate(item.path)}
                >
                  <span className="home-card-icon">{item.icon}</span>
                  <span className="home-card-label">{item.label}</span>
                  <span className="home-card-desc">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
