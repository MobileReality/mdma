import { useState } from 'react';

interface PromptOutputProps {
  prompt: string;
  isGenerating: boolean;
}

export function PromptOutput({ prompt, isGenerating }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToFile = () => {
    const blob = new Blob([prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mdma-custom-prompt.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!prompt && !isGenerating) {
    return (
      <div style={containerStyle}>
        <div style={{ color: '#666', fontSize: '13px', textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ marginBottom: '8px' }}>Configure your components and click <strong>Generate</strong>.</p>
          <p style={{ fontSize: '11px' }}>
            The generated prompt will be used with:<br />
            <code style={{ color: '#a5b4fc' }}>buildSystemPrompt({'{ customPrompt }'})</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
          Generated Prompt
        </h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={copyToClipboard} style={actionBtnStyle} disabled={!prompt}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={saveToFile} style={actionBtnStyle} disabled={!prompt}>
            Save
          </button>
        </div>
      </div>

      <pre
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          border: '1px solid #333',
          borderRadius: '6px',
          background: '#0a0a0a',
          color: '#d4d4d4',
          fontSize: '12px',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
        }}
      >
        {prompt}
        {isGenerating && <span style={{ color: '#6366f1' }}>|</span>}
      </pre>

      {prompt && (
        <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #1e1b4b', borderRadius: '6px', background: '#0f0e26' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Usage in your app:</p>
          <code style={{ fontSize: '12px', color: '#a5b4fc' }}>
            {`import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';`}
            <br />
            <br />
            {`const systemPrompt = buildSystemPrompt({`}
            <br />
            {`  customPrompt: \`<paste generated prompt here>\``}
            <br />
            {`});`}
          </code>
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #333',
  borderRadius: '4px',
  background: '#1a1a1a',
  color: '#e0e0e0',
  fontSize: '11px',
  cursor: 'pointer',
};
