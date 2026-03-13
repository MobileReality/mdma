import type { DomainConfig, TriggerMode } from '../hooks/use-prompt-builder.js';

interface DomainFormProps {
  domain: DomainConfig;
  onChange: (domain: DomainConfig) => void;
  onSample: () => void;
}

const TRIGGER_OPTIONS: { mode: TriggerMode; label: string; description: string }[] = [
  { mode: 'keyword', label: 'Keyword / Phrase', description: 'User says a specific word or phrase' },
  { mode: 'immediate', label: 'Immediate', description: 'Right when conversation starts' },
  { mode: 'contextual', label: 'Contextual', description: 'Based on conversation context' },
];

export function DomainForm({ domain, onChange, onSample }: DomainFormProps) {
  const update = (key: keyof DomainConfig, value: string) => {
    onChange({ ...domain, [key]: value });
  };

  const setTriggerMode = (mode: TriggerMode) => {
    onChange({ ...domain, triggerMode: mode, trigger: mode === 'immediate' ? '' : domain.trigger });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
          Domain Context
        </h3>
        <button
          type="button"
          onClick={onSample}
          style={sampleBtnStyle}
          title="Fill with random sample data"
        >
          Sample
        </button>
      </div>

      <label style={labelStyle}>
        <span style={labelTextStyle}>Flow Name</span>
        <input
          type="text"
          value={domain.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g., kyc-verification"
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>Domain</span>
        <input
          type="text"
          value={domain.domain}
          onChange={(e) => update('domain', e.target.value)}
          placeholder="e.g., finance, healthcare, engineering"
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>Description</span>
        <textarea
          value={domain.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="What should this flow accomplish?"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>Business Rules</span>
        <textarea
          value={domain.businessRules}
          onChange={(e) => update('businessRules', e.target.value)}
          placeholder="Constraints, requirements, compliance rules..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={labelTextStyle}>When to Display</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {TRIGGER_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTriggerMode(opt.mode)}
              title={opt.description}
              style={{
                ...triggerBtnStyle,
                ...(domain.triggerMode === opt.mode
                  ? { borderColor: '#6366f1', color: '#a5b4fc', background: '#1e1b4b' }
                  : {}),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {domain.triggerMode === 'keyword' && (
          <input
            type="text"
            value={domain.trigger}
            onChange={(e) => update('trigger', e.target.value)}
            placeholder='e.g., "start KYC", "new incident", "onboard vendor"'
            style={inputStyle}
          />
        )}

        {domain.triggerMode === 'immediate' && (
          <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
            Components will be generated in the first response.
          </span>
        )}

        {domain.triggerMode === 'contextual' && (
          <textarea
            value={domain.trigger}
            onChange={(e) => update('trigger', e.target.value)}
            placeholder='Describe the situation, e.g., "After user provides customer name and issue description" or "When 3 resolution attempts have failed"'
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const labelTextStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: '#aaa',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #333',
  borderRadius: '6px',
  background: '#1a1a1a',
  color: '#e0e0e0',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
};

const sampleBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid #333',
  borderRadius: '4px',
  background: '#1a1a1a',
  color: '#6366f1',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
};

const triggerBtnStyle: React.CSSProperties = {
  padding: '5px 10px',
  border: '1px solid #333',
  borderRadius: '4px',
  background: '#1a1a1a',
  color: '#888',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
  flex: 1,
  textAlign: 'center',
};
