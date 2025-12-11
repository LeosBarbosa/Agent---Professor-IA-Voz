
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { memo } from 'react';
import { Persona, usePersonaStore, useLogStore } from '../../lib/state';

interface PersonaCardProps {
  persona: Persona;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ persona }) => {
  const { setActivePersonaById } = usePersonaStore();
  const { startNewConversation } = useLogStore();

  const handleSelect = () => {
    setActivePersonaById(persona.id);
    startNewConversation();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect();
    }
  };

  return (
    <div
      className="persona-card"
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Iniciar conversa com a persona ${persona.name}`}
    >
      <div className="persona-card-icon">
        <span className="icon">{persona.icon}</span>
      </div>
      <div className="persona-card-title">
        <h3>{persona.name}</h3>
        {persona.isDefault && <span className="icon default-star" title="Persona Padrão">star</span>}
      </div>
      <p>{persona.tagline}</p>
    </div>
  );
};

export default memo(PersonaCard);
