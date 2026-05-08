import { useState, useEffect, useRef } from 'react';
import { AgentChatView } from './AgentChatView.js';
import { CustomChatView } from './CustomChatView.js';
import { PlaygroundView } from './PlaygroundView.js';
import { ValidatorView } from './ValidatorView.js';

// ── Routing ──────────────────────────────────────────────────────────────────

function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  return pathname;
}

function navigate(to: string) {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ── Nav config ───────────────────────────────────────────────────────────────

type Route = '/chat' | '/custom' | '/playground' | '/validator';

interface NavItem {
  path: Route;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'AI',
    items: [
      { path: '/chat', label: 'AI Chat' },
      { path: '/custom', label: 'Custom Components' },
      { path: '/playground', label: 'Playground' },
    ],
  },
  {
    label: 'Tools',
    items: [{ path: '/validator', label: 'Validator' }],
  },
];

function labelForPath(path: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.path === path) return item.label;
    }
  }
  return path.slice(1);
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/') navigate('/chat');
  }, [pathname]);

  const route: Route = (pathname as Route) || '/chat';

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="demo-layout">
      <header className="demo-header">
        <div className="demo-header-left">
          <h1 className="demo-title">MDMA</h1>
          <span className="demo-subtitle">Interactive Document Demo</span>
        </div>
        <div className="demo-header-right">
          <div className="demo-nav" ref={dropdownRef}>
            <button
              type="button"
              className="demo-nav-trigger"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              {labelForPath(route)}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="demo-nav-dropdown">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className="demo-nav-group">
                    <div className="demo-nav-group-label">{group.label}</div>
                    {group.items.map((item) => (
                      <a
                        key={item.path}
                        href={item.path}
                        className={`demo-nav-item ${route === item.path ? 'demo-nav-item--active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(item.path);
                          setDropdownOpen(false);
                        }}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {route === '/validator' ? (
        <ValidatorView />
      ) : route === '/playground' ? (
        <PlaygroundView />
      ) : route === '/custom' ? (
        <CustomChatView />
      ) : (
        <AgentChatView />
      )}
    </div>
  );
}
