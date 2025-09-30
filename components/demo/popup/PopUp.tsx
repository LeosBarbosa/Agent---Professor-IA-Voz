/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './PopUp.css';
import { useTools } from '@/lib/state';
import { personaConfig } from '@/lib/state';

interface PopUpProps {
  onClose: () => void;
}

const PopUp: React.FC<PopUpProps> = ({ onClose }) => {
  const { template } = useTools();
  const content = personaConfig[template].popup;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>{content.title}</h2>
        <p>{content.p1}</p>
        <p>{content.p2}</p>
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
