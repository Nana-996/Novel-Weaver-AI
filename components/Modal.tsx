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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overlay-enter"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-ink-100 border border-ink-400/30 rounded-2xl shadow-2xl w-full max-w-xl overlay-content-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-400/20">
          <h2 className="text-lg font-semibold text-parchment">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-ink-300/50 text-parchment-dim hover:text-parchment transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-ink-400/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;