import React, { useEffect } from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-4 overlay-enter"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="bg-ink-100 border border-ink-400/25 rounded-2xl shadow-2xl w-full max-w-xl max-h-[88dvh] flex flex-col overlay-content-enter overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-ink-400/20 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-parchment truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-ink-300/50 text-parchment-dim hover:text-parchment transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto scrollbar-thin flex-1 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4 border-t border-ink-400/20 flex-shrink-0 bg-ink-200/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;