import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TimeOutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="ti ti-alert-triangle text-3xl" />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">Session Timed Out</h3>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          You have been logged out automatically due to inactivity to keep your notes secure.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all shadow-lg shadow-accent/25"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
};
