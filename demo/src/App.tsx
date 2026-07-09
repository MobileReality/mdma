import { useState, useEffect, useRef } from 'react';
import { MdmaThemeProvider } from '@mobile-reality/mdma-renderer-react';
import logoUrl from '../../assets/logo.svg';
import { DemoThemeContext, type ThemeMode } from './theme-context.js';
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

// ── Theme (applied to the demo chrome + the rendered MDMA examples) ────────────

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'auto'];
const THEME_ICON: Record<ThemeMode, string> = { light: '☀️', dark: '🌙', auto: '🖥️' };

function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem('mdma-demo-theme');
    return saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'light';
  });
  useEffect(() => {
    window.localStorage.setItem('mdma-demo-theme', mode);
  }, [mode]);
  return [mode, setMode];
}

/**
 * Resolve `'auto'` to a concrete `'light'`/`'dark'` by watching the OS
 * preference, so the demo can drive both its chrome and the MDMA examples off a
 * single attribute (no `prefers-color-scheme` duplication in the CSS).
 */
function useResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  if (mode === 'auto') return systemDark ? 'dark' : 'light';
  return mode;
}

function ThemeToggle({ mode, onChange }: { mode: ThemeMode; onChange: (m: ThemeMode) => void }) {
  return (
    <div className="demo-theme-toggle" aria-label="Example theme">
      {THEME_MODES.map((m) => (
        <button
          key={m}
          type="button"
          className={`demo-theme-btn ${mode === m ? 'demo-theme-btn--active' : ''}`}
          onClick={() => onChange(m)}
          title={`${m[0].toUpperCase()}${m.slice(1)} theme for examples`}
          aria-pressed={mode === m}
        >
          <span aria-hidden="true">{THEME_ICON[m]}</span>
        </button>
      ))}
    </div>
  );
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
      { path: '/preview', label: 'Preview', icon: '🛡️' },
      { path: '/chat', label: 'Agent Chat', icon: '⚡' },
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
  const [themeMode, setThemeMode] = useThemeMode();
  const resolvedTheme = useResolvedTheme(themeMode);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Drive dark mode from the root element so the whole page (including the body
  // background behind transparent panels) picks up the `[data-theme='dark']`
  // chrome overrides.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [resolvedTheme]);

  return (
    <DemoThemeContext.Provider value={resolvedTheme}>
      <div className="demo-layout" data-theme={resolvedTheme}>
        <header className="demo-header">
          <div className="demo-header-left">
            <button type="button" className="demo-title-link" onClick={() => navigate('/')}>
              <img src={logoUrl} alt="MDMA" className="demo-logo" />
            </button>
            <span className="demo-subtitle">The open standard for AI-generated interactive UI</span>
          </div>
          <div className="demo-header-right">
            <ThemeToggle mode={themeMode} onChange={setThemeMode} />
            <a
              className="demo-ph-badge"
              href="https://www.producthunt.com/products/mdma-genui-for-apps?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-mdma-genui-for-apps"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                alt="MDMA - GenUI for apps - Turn AI chat responses into interactive forms and workflows | Product Hunt"
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1162215&theme=light&t=1780988696527"
              />
            </a>
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

        <MdmaThemeProvider theme={resolvedTheme} style={{ display: 'contents' }}>
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
        </MdmaThemeProvider>
      </div>
    </DemoThemeContext.Provider>
  );
}
