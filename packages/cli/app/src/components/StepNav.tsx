export interface Step {
  id: string;
  label: string;
  icon: string;
}

interface StepNavProps {
  steps: readonly Step[];
  currentStep: string;
  onStepChange: (id: string) => void;
}

export function StepNav({ steps, currentStep, onStepChange }: StepNavProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav className="flex lg:flex-col border-b lg:border-b-0 border-border-light">
      <div className="flex lg:flex-col w-full">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onStepChange(s.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              border-b-2 lg:border-b-0 lg:border-l-2 flex-1 lg:flex-none
              ${
                currentStep === s.id
                  ? 'border-primary text-primary bg-primary-light/50'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-1'
              }
            `}
          >
            <span
              className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${
                i < currentIndex
                  ? 'bg-success text-white'
                  : currentStep === s.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-3 text-text-secondary'
              }
            `}
            >
              {i < currentIndex ? '\u2713' : s.icon}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
