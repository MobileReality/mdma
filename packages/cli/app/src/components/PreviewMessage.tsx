import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';

interface PreviewMessageProps {
  role: 'user' | 'assistant';
  content: string;
  ast: MdmaRoot | null;
  store: DocumentStore | null;
}

export function PreviewMessage({ role, content, ast, store }: PreviewMessageProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[11px] font-semibold ${role === 'user' ? 'text-primary' : 'text-success'}`}>
        {role === 'user' ? 'You' : 'MDMA AI'}
      </span>
      {role === 'user' ? (
        <div className="px-3 py-2 rounded-lg bg-primary-light text-primary-text text-sm leading-relaxed self-end max-w-[80%]">
          {content}
        </div>
      ) : ast && store ? (
        <div className="px-4 py-3 rounded-lg bg-surface-2 border border-border-light text-sm leading-relaxed max-w-full overflow-auto">
          <MdmaDocument ast={ast} store={store} />
        </div>
      ) : content ? (
        <div className="px-4 py-3 rounded-lg bg-surface-2 border border-border-light">
          <pre className="m-0 whitespace-pre-wrap text-xs text-text-secondary">{content}</pre>
          <span className="text-[11px] text-primary">Parsing...</span>
        </div>
      ) : (
        <div className="px-4 py-3 rounded-lg bg-surface-2 border border-border-light">
          <span className="text-xs text-text-muted">Generating...</span>
        </div>
      )}
    </div>
  );
}
