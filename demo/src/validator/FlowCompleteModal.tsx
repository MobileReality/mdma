interface FlowCompleteModalProps {
  stepCount: number;
  onClose: () => void;
}

export function FlowCompleteModal({ stepCount, onClose }: FlowCompleteModalProps) {
  return (
    <div className="flow-complete-overlay" onClick={onClose}>
      <div className="flow-complete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flow-complete-icon">&#10003;</div>
        <h2>Flow Completed!</h2>
        <p>All {stepCount} steps have been validated successfully.</p>
        <button type="button" className="flow-complete-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
