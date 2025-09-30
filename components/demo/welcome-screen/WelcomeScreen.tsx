/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './WelcomeScreen.css';
import { useTools, personaConfig, useLogStore } from '@/lib/state';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';

const WelcomeScreen: React.FC = () => {
  const { template } = useTools();
  const { title, description, prompts } = personaConfig[template].welcome;

  const { connect, connected, client } = useLiveAPIContext();
  const addTurn = useLogStore(state => state.addTurn);

  const handlePromptClick = async (prompt: string) => {
    try {
      if (!connected) {
        await connect();
      }
      // Add the user's turn to the log immediately
      addTurn({ role: 'user', text: prompt, isFinal: true });
      // Send the text content to the AI
      client.send({ text: prompt });
    } catch (error) {
      console.error('Falha ao conectar ou enviar mensagem:', error);
      // O ErrorScreen deve lidar com a exibição deste erro.
    }
  };


  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="title-container">
          <span className="welcome-icon">auto_awesome</span>
          <h2 className="welcome-title">{title}</h2>
        </div>
        <p className="welcome-description">{description}</p>
        <div className="prompt-suggestions-grid">
          {prompts.map((p, index) => (
            <div key={index} className="prompt-card">
              <h4>{p.title}</h4>
              <p>{p.description}</p>
              <button onClick={() => handlePromptClick(p.prompt)}>
                <span className="icon">play_arrow</span>
                <span>"{p.prompt}"</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;