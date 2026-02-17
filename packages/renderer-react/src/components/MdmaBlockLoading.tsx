import { memo } from 'react';

export interface MdmaBlockLoadingProps {
  node: { value?: string };
}

/** Try to extract a component type hint from partial YAML (e.g. "type: form"). */
function extractTypeHint(yaml?: string): string | null {
  if (!yaml) return null;
  const match = yaml.match(/^\s*type:\s*(\S+)/m);
  return match ? match[1] : null;
}

export const MdmaBlockLoading = memo(function MdmaBlockLoading({ node }: MdmaBlockLoadingProps) {
  const typeHint = extractTypeHint(node.value);

  return (
    <div className="mdma-block-loading">
      <div className="mdma-block-loading-shimmer" />
      <div className="mdma-block-loading-content">
        <span className="mdma-block-loading-icon" />
        <span className="mdma-block-loading-text">
          {typeHint
            ? `Loading ${typeHint} component...`
            : 'Loading component...'}
        </span>
      </div>
    </div>
  );
});
