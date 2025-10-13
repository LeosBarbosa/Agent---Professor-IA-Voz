/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useMemo } from 'react';
import { useLogStore } from '../../../lib/state';
import { renderContent } from '../../../lib/render-utils';
import './PresentationView.css';

interface PresentationViewProps {
  onClose: () => void;
}

const PresentationView: React.FC<PresentationViewProps> = ({ onClose }) => {
  const turns = useLogStore(state => state.turns);

  const lastAgentTurn = useMemo(() => {
    return [...turns].reverse().find(turn => turn.role === 'agent');
  }, [turns]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="presentation-view-overlay" onClick={onClose}>
      <button className="presentation-close-button" onClick={onClose} title="Sair do modo de apresentação (Esc)" aria-label="Sair do modo de apresentação">
        <span className="icon">close</span>
      </button>
      <div className="presentation-content" onClick={(e) => e.stopPropagation()}>
        {lastAgentTurn ? (
          renderContent(lastAgentTurn.text)
        ) : (
          <p>Nenhuma resposta do agente para apresentar.</p>
        )}
      </div>
    </div>
  );
};

export default PresentationView;