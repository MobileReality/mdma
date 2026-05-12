import { useState, useEffect, useRef } from 'react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { StoreAction } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { parseMarkdown } from '../../chat/parse-markdown.js';

const DEMO_DOC = `\`\`\`mdma
type: tasklist
id: runtime-demo
items:
  - id: step-1
    text: "Parse the Markdown document"
    checked: true
  - id: step-2
    text: "Create a document store"
    checked: true
  - id: step-3
    text: "Subscribe to the event bus"
    checked: false
  - id: step-4
    text: "Dispatch and observe actions"
    checked: false
\`\`\``;

interface LogEntry {
  id: number;
  timestamp: string;
  action: StoreAction;
}

export function RuntimeDemo() {
  const [parsed, setParsed] = useState<{ ast: MdmaRoot; store: DocumentStore } | null>(null);
  const [events, setEvents] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    parseMarkdown(DEMO_DOC).then(setParsed);
  }, []);

  useEffect(() => {
    if (!parsed) return;
    const unsub = parsed.store.getEventBus().onAny((action: StoreAction) => {
      setEvents((prev) => [
        ...prev,
        { id: ++idRef.current, timestamp: new Date().toLocaleTimeString(), action },
      ]);
    });
    return unsub;
  }, [parsed]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  if (!parsed) return null;

  return (
    <div className="docs-runtime-demo">
      <div className="docs-runtime-demo-doc">
        <MdmaDocument ast={parsed.ast} store={parsed.store} />
      </div>

      <div className="docs-runtime-demo-log">
        <div className="docs-runtime-demo-log-header">
          <span className="demo-event-title">Action Log</span>
          {events.length > 0 && (
            <button
              type="button"
              className="docs-runtime-demo-clear"
              onClick={() => { setEvents([]); idRef.current = 0; }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="demo-event-log" ref={logRef}>
          {events.length === 0 ? (
            <p className="demo-event-empty">Check or uncheck items to see runtime events.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="demo-event-entry">
                <span className="demo-event-time">{e.timestamp}</span>
                <span className={`demo-event-type demo-event-type--${e.action.type}`}>
                  {e.action.type}
                </span>
                <span className="demo-event-component">{e.action.componentId}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
