export interface BackendInfo {
  live: boolean;
  model: string;
  promptVariant?: string;
}

interface HeaderProps {
  info: BackendInfo | null;
  playing: boolean;
  onPlay: () => void;
}

/** Backend status: reachable and keyed, reachable but unkeyed, or not there at all. */
function Status({ info }: { info: BackendInfo | null }) {
  if (!info) {
    return (
      <>
        <span className="dot running" /> backend unreachable — run <code>pnpm backend</code> in{' '}
        <code>examples/integrations/ag-ui</code>
      </>
    );
  }
  if (!info.live) {
    return (
      <>
        <span className="dot running" /> no key — set <code>OPENROUTER_API_KEY</code> in the backend{' '}
        <code>.env</code>
      </>
    );
  }
  return (
    <>
      <span className="dot done" /> live · <code>{info.model}</code>
    </>
  );
}

export function Header({ info, playing, onPlay }: HeaderProps) {
  return (
    <header>
      <div className="header-row">
        <h1>MDMA agent — live</h1>
        <button
          type="button"
          className="play"
          onClick={onPlay}
          disabled={!info?.live || playing}
          title="Replay a scripted bug-report conversation against the live agent"
        >
          {playing ? '▶ Playing…' : '▶ Play demo'}
        </button>
      </div>
      <p>
        Real <code>@ag-ui/client</code> HttpAgent → AG-UI backend → LLM → MDMA. Ask for a form, an
        approval gate, a table, or a checklist.
      </p>
      <div className="status">
        <Status info={info} />
      </div>
    </header>
  );
}
