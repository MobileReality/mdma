import type { MdmaActivity, MdmaSharedState } from '@mobile-reality/mdma-agui';

/**
 * The two things worth watching while the agent works: what it knows (shared state) and what it's
 * doing (tool calls). Both are kept out of the chat thread on purpose.
 */
export function Sidebar({ state, activity }: { state: MdmaSharedState; activity: MdmaActivity[] }) {
  const hasState = Object.keys(state).length > 0;

  return (
    <aside className="sidebar">
      <section className="state-panel">
        <h2>🧠 Shared state</h2>
        <p className="hint">
          The agent's AG-UI state. <code>profile</code> = what it remembers about you; other keys
          are form values. Forms pre-fill from matching component ids.
        </p>
        <pre className={hasState ? 'filled' : 'emptyState'}>{JSON.stringify(state, null, 2)}</pre>
      </section>

      <section className="activity-panel">
        <h2>⚙️ Activity feed</h2>
        <p className="hint">
          Tool calls / steps / reasoning — the agent's actions, kept separate from the rendered
          documents.
        </p>
        {activity.length === 0 && <p className="emptyState">No activity yet.</p>}
        <ul>
          {activity.map((item) => (
            <li key={item.id} className={`act act-${item.kind} ${item.status}`}>
              <span className="act-head">
                <span className="act-kind">{item.kind}</span>
                <strong>{item.label}</strong>
                <span className={`dot ${item.status}`}>{item.status === 'done' ? '✓' : '…'}</span>
              </span>
              {item.detail && <code className="act-detail">{item.detail}</code>}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
