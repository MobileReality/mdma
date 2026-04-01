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
      <div className="flex flex-col h-full">
        <div className="text-text-muted text-sm text-center py-10 px-5">
          <p className="mb-2">
            Configure your components and click <strong>Generate</strong>.
          </p>
          <p className="text-[11px]">
            The generated prompt will be used with:
            <br />
            <code className="text-primary-text">buildSystemPrompt({'{ customPrompt }'})</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="m-0 text-sm font-semibold text-text-primary">Generated Prompt</h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={!prompt}
            className="px-3 py-1 border border-border rounded bg-surface-1 text-text-primary text-[11px] cursor-pointer hover:bg-surface-2 transition-colors disabled:opacity-40"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={saveToFile}
            disabled={!prompt}
            className="px-3 py-1 border border-border rounded bg-surface-1 text-text-primary text-[11px] cursor-pointer hover:bg-surface-2 transition-colors disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      <pre className="flex-1 overflow-y-auto p-3 border border-border rounded-md bg-surface-0 text-text-primary text-xs leading-relaxed whitespace-pre-wrap break-words m-0">
        {prompt}
        {isGenerating && <span className="text-primary">|</span>}
      </pre>

      {prompt && (
        <div className="mt-2.5 p-2.5 border border-primary/30 rounded-md bg-primary-light/50">
          <p className="m-0 text-[11px] text-text-secondary">Usage in your app:</p>
          <code className="text-xs text-primary-text">
            {"import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';"}
            <br />
            <br />
            {'const systemPrompt = buildSystemPrompt({'}
            <br />
            {'  customPrompt: `<paste generated prompt here>`'}
            <br />
            {'});'}
          </code>
        </div>
      )}
    </div>
  );
}
