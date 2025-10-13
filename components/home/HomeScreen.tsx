/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { usePersonaStore, useUI } from '../../../lib/state';
import PersonaCard from './PersonaCard';
import FilePrimingArea from './FilePrimingArea';

const HomeScreen: React.FC = () => {
  const { personas } = usePersonaStore();
  const { togglePersonaManagement } = useUI();

  return (
    <div className="home-screen">
      <div className="home-screen-settings">
         <button
          className="settings-button"
          onClick={togglePersonaManagement}
          aria-label="Gerenciar Personas"
          title="Gerenciar Personas"
        >
          <span className="icon">settings</span>
        </button>
      </div>
      <header className="home-header">
        <h1>Bem-vindo ao IA Persona!</h1>
        <p>Este é um espaço interativo para explorar e criar especialistas de IA usando a API Gemini.</p>
      </header>
      <FilePrimingArea />
      <div className="persona-grid">
        {personas.map(persona => (
          <PersonaCard key={persona.id} persona={persona} />
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;