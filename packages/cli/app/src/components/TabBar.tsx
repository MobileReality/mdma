interface TabBarProps {
  tabs: readonly string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  indicators?: Record<string, string>;
}

export function TabBar({ tabs, activeTab, onTabChange, indicators = {} }: TabBarProps) {
  return (
    <div className="flex border-b border-border-light px-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`
            px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize
            ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }
          `}
        >
          {tab}
          {indicators[tab] && (
            <span className={`ml-1.5 w-1.5 h-1.5 rounded-full inline-block ${indicators[tab]}`} />
          )}
        </button>
      ))}
    </div>
  );
}
