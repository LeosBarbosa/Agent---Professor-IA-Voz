/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import Modal from './Modal';

type ConfirmationModalProps = {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText: string;
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
}) => {
  return (
    <Modal onClose={onCancel}>
      <div className="confirmation-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-button">
            Cancelar
          </button>
          <button onClick={onConfirm} className="confirm-button danger">
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
