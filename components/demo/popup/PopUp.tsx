/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { usePersonaStore } from '../../../lib/state';
import './PopUp.css';

interface PopUpProps {
  onClose: () => void;
}

const PopUp: React.FC<PopUpProps> = ({ onClose }) => {
  const { activePersona } = usePersonaStore();

  if (!activePersona) {
    return null; // Don't render if no persona is active
  }
  const content = activePersona.welcome;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>{content.title}</h2>
        <p>{content.description}</p>
        <ol>
          <li><span className="icon">play_circle</span>Pressione Play para começar a falar.</li>
          <li><span className="icon">save_as</span>Copie este sandbox para criar sua própria versão.</li>
          <li><span className="icon">auto_awesome</span>Use o Code Assistant para personalizar e testar.</li>
        </ol>
        <button onClick={onClose}>Começar</button>
      </div>
    </div>
  );
};

export default PopUp;