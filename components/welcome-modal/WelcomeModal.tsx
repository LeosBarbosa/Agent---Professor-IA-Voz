/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useUI } from '../../../lib/state';

const WelcomeModal: React.FC = () => {
  const { setWelcomeModalOpen } = useUI();

  return (
    <div className="welcome-modal-overlay">
      <div className="welcome-modal-content">
        <h2>Bem-vindo ao IA Persona!</h2>
        <p>Este é um espaço interativo para explorar e criar diferentes especialistas de IA usando a API Gemini.</p>
        <div className="welcome-modal-steps">
           <div className="welcome-modal-step">
              <span className="icon">apps</span>
              <span><strong>1. Escolha uma Persona:</strong> Selecione um dos especialistas pré-configurados para iniciar uma conversa.</span>
           </div>
           <div className="welcome-modal-step">
              <span className="icon">settings</span>
              <span><strong>2. Personalize:</strong> Clique no ícone de configurações para editar, criar e gerenciar suas próprias personas de IA.</span>
           </div>
        </div>
        <button onClick={() => setWelcomeModalOpen(false)}>Vamos Começar</button>
      </div>
    </div>
  );
};

export default WelcomeModal;