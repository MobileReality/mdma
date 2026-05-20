import { useState, useEffect, useRef } from 'react';
import logoUrl from '../../assets/logo.svg';
import { AgentChatView } from './AgentChatView.js';
import { ChatView } from './ChatView.js';
import { CustomChatView } from './CustomChatView.js';
import { DocsView } from './DocsView.js';
import { HomeView } from './HomeView.js';
import { PreviewView } from './PreviewView.js';
import { ValidatorView } from './ValidatorView.js';

// ── Routing ──────────────────────────────────────────────────────────────────

function usePathname() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/');
  useEffect(() => {
    const sync = () => setHash(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return hash;
}

function navigate(to: string) {
  window.location.hash = to;
}

// ── Nav config ───────────────────────────────────────────────────────────────

type Route = '/' | '/chat' | '/preview' | '/author' | '/custom' | '/validator' | '/docs';

interface NavItem {
  path: Route;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Agentic',
    items: [
      { path: '/chat', label: 'Agent Chat', icon: '⚡' },
      { path: '/preview', label: 'Insurance Preview', icon: '🛡️' },
    ],
  },
  {
    label: 'Completions',
    items: [
      { path: '/author', label: 'MDMA Chat', icon: '✍️' },
      { path: '/custom', label: 'Custom Components', icon: '🎨' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/validator', label: 'Validator', icon: '🔍' },
      { path: '/docs', label: 'Docs', icon: '📖' },
    ],
  },
];

function labelForPath(path: string): string {
  const normalized = path.startsWith('/docs') ? '/docs' : path;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.path === normalized) return item.label;
    }
  }
  return path.slice(1);
}

// ── GitHub star count ─────────────────────────────────────────────────────────

function useGitHubStars(repo: string) {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    fetch(`https://api.github.com/repos/${repo}`)
      .then((r) => r.json())
      .then((data) => setStars(data.stargazers_count ?? null))
      .catch(() => {});
  }, [repo]);
  return stars;
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const pathname = usePathname();

  const route: Route = (pathname as Route) || '/';

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stars = useGitHubStars('MobileReality/mdma');

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
          <button type="button" className="demo-title-link" onClick={() => navigate('/')}>
            <img src={logoUrl} alt="MDMA" className="demo-logo" />
          </button>
          <span className="demo-subtitle">The open standard for AI-generated interactive UI</span>
        </div>
        <div className="demo-header-right">
          <a
            className="demo-star-btn"
            href="https://github.com/MobileReality/mdma"
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Star
            {stars !== null && <span className="demo-star-count">{stars.toLocaleString()}</span>}
          </a>
          {route !== '/' && (
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
                          href={`#${item.path}`}
                          className={`demo-nav-item ${route === item.path ? 'demo-nav-item--active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.path);
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="demo-nav-item-icon">{item.icon}</span>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {route === '/' ? (
        <HomeView />
      ) : route.startsWith('/docs') ? (
        <DocsView />
      ) : route === '/validator' ? (
        <ValidatorView />
      ) : route === '/custom' ? (
        <CustomChatView />
      ) : route === '/author' ? (
        <ChatView />
      ) : route === '/preview' ? (
        <PreviewView />
      ) : (
        <AgentChatView />
      )}
    </div>
  );
}
