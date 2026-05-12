import { useState } from 'react';
import hljs from 'highlight.js/lib/core';
import hljsBash from 'highlight.js/lib/languages/bash';
import hljsJson from 'highlight.js/lib/languages/json';
import hljsTypeScript from 'highlight.js/lib/languages/typescript';
import hljsXml from 'highlight.js/lib/languages/xml';
import hljsYaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', hljsBash);
hljs.registerLanguage('json', hljsJson);
hljs.registerLanguage('typescript', hljsTypeScript);
hljs.registerLanguage('xml', hljsXml);
hljs.registerLanguage('yaml', hljsYaml);

const LANG_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mdma: 'yaml',
  bash: 'bash',
  json: 'json',
  text: 'plaintext',
  code: 'plaintext',
};

function HighlightedCode({ html, fallback }: { html: string | null; fallback: string }) {
  if (!html) return <code>{fallback}</code>;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: content is hljs output, not user input
  return <code dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Code({ children, lang }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const hljsLang = LANG_MAP[lang ?? 'code'] ?? 'plaintext';
  const highlighted =
    hljsLang !== 'plaintext' && hljs.getLanguage(hljsLang)
      ? hljs.highlight(children, { language: hljsLang }).value
      : null;

  return (
    <div className="docs-code-block">
      <div className="docs-code-header">
        <span className="docs-code-lang">{lang ?? 'code'}</span>
        <button type="button" className="docs-code-copy" onClick={copy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="docs-code">
        <HighlightedCode html={highlighted} fallback={children} />
      </pre>
    </div>
  );
}
