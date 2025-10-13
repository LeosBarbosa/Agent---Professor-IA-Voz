/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useMemo } from 'react';
import { usePersonaStore, useLogStore, useUI, useFileStore } from '../../../lib/state';
import { useLiveAPIProvider } from '../../../contexts/LiveAPIContext';
import FilePrimingArea from '../../home/FilePrimingArea';
import './WelcomeScreen.css';


const WelcomeScreen: React.FC = () => {
  const { activePersona } = usePersonaStore();
  const setView = useUI(state => state.setView);
  const { connect, connected, client } = useLiveAPIProvider();
  const addTurn = useLogStore(state => state.addTurn);
  const { files, clearFiles } = useFileStore();
  
  if (!activePersona) {
    // Should not happen if view is 'chat', but good to have a fallback
    return <div className="welcome-screen">Carregando persona...</div>;
  }
  
  const { welcome, icon } = activePersona;
  const { title, description, prompts, tips } = welcome;

  const tipOfTheDay = useMemo(() => {
    if (!tips || tips.length === 0) return null;
    return tips[Math.floor(Math.random() * tips.length)];
  }, [tips]);

  const constructPrimingPrompt = (initialPrompt: string) => {
    if (files.length === 0) {
      return initialPrompt;
    }

    const fileContents = files
      .map(
        f => `---
**Arquivo: ${f.name}**

${f.content}
---`,
      )
      .join('\n\n');

    return `Antes de começarmos, por favor, revise o conteúdo dos seguintes arquivos que estou fornecendo como contexto para nossa conversa. Considere essas informações como sua memória base para nossas interações.

${fileContents}

Agora, vamos começar. Minha primeira pergunta é: ${initialPrompt}`;
  };

  const handlePromptClick = async (prompt: string) => {
    try {
      if (!connected) {
        await connect();
      }
      const fullPrompt = constructPrimingPrompt(prompt);
      addTurn({ role: 'user', text: fullPrompt, isFinal: true });
      client.send({ text: fullPrompt });
      clearFiles();
      setView('chat'); // Already in chat view, but ensures state consistency
    } catch (error) {
      console.error('Falha ao conectar ou enviar mensagem:', error);
    }
  };


  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="title-container">
          <span className="welcome-icon">{icon}</span>
          <h2 className="welcome-title">{title}</h2>
        </div>
        <p className="welcome-description">{description}</p>
        <FilePrimingArea />
        {tipOfTheDay && (
          <div className="tip-of-the-day-card">
            <span className="icon">lightbulb</span>
            <div className="tip-content">
              <h4>Dica do Dia</h4>
              <p>{tipOfTheDay}</p>
            </div>
          </div>
        )}
        <div className="prompt-suggestions-grid">
          {prompts.map((p, index) => (
            <div
              key={index}
              className="prompt-card"
              role="article"
              aria-labelledby={`prompt-title-${index}`}
            >
              <h4 id={`prompt-title-${index}`}>{p.title}</h4>
              <p>{p.description}</p>
              <button
                onClick={() => handlePromptClick(p.prompt)}
                aria-label={`Iniciar conversa sobre: ${p.title}`}
              >
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