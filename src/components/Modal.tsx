import React, { useEffect, useState } from 'react';
import '../admin/OrderManagement.css';

type Variant = 'success' | 'danger' | 'neutral';

interface ModalProps {
  open: boolean;
  title?: string;
  variant?: Variant;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, title, variant = 'neutral', confirmLabel = 'Confirm', confirmDisabled, onClose, onConfirm, children }) => {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) setVisible(true);
    else {
      // play exit animation then hide
      const t = setTimeout(() => setVisible(false), 210);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal-card ${variant === 'success' ? 'modal-success' : variant === 'danger' ? 'modal-danger' : ''}`}>
        <div className="modal-content">
          {title && <h3 className="modal-title">{title}</h3>}
          <div className="modal-text">{children}</div>
          <div className="modal-actions" style={{ marginTop: 18 }}>
            <button className="btn confirm" onClick={onConfirm} disabled={confirmDisabled}>
              {confirmDisabled ? 'Processing…' : confirmLabel}
            </button>
            <button className="btn secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
