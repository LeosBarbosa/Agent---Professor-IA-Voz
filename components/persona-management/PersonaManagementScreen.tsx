/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { useUI, usePersonaStore, Persona } from '../../../lib/state';
import PersonaEditor from './PersonaEditor';
import PersonaCreationWizard from './PersonaCreationWizard';

const PersonaManagementScreen: React.FC = () => {
  const { togglePersonaManagement } = useUI();
  const { personas, deletePersona } = usePersonaStore();
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleAddNew = () => {
    setSelectedPersona(null); // Deselect any current persona
    setIsWizardOpen(true);
  };

  const handleDelete = (id: string) => {
    deletePersona(id);
    setSelectedPersona(null);
  };
  
  const handleListItemKeyDown = (event: React.KeyboardEvent, persona: Persona) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedPersona(persona);
    }
  };
  
  return (
    <>
      <div className="persona-management-overlay" onClick={togglePersonaManagement}>
        <div className="persona-management-container" onClick={(e) => e.stopPropagation()}>
          <header className="persona-management-header">
            <h2>Gerenciar Personas</h2>
            <button className="close-button" onClick={togglePersonaManagement} aria-label="Fechar gerenciador de personas">
              <span className="icon">close</span>
            </button>
          </header>
          <div className="persona-management-body">
            <aside className="persona-list-panel">
              <div className="persona-list-header">
                <button className="add-persona-button" onClick={handleAddNew}>
                  <span className="icon">add</span> Criar Nova Persona
                </button>
              </div>
              <div className="persona-list">
                {personas.map(p => (
                  <div 
                    key={p.id}
                    className={`persona-list-item ${selectedPersona?.id === p.id ? 'active' : ''}`}
                    onClick={() => setSelectedPersona(p)}
                    onKeyDown={(e) => handleListItemKeyDown(e, p)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Editar persona ${p.name}`}
                    aria-current={selectedPersona?.id === p.id ? 'true' : undefined}
                  >
                    <span className="icon">{p.icon}</span>
                    <span className="persona-list-item-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </aside>
            <main className="persona-editor-panel">
              {selectedPersona ? (
                <PersonaEditor 
                  persona={selectedPersona}
                  onCancel={() => setSelectedPersona(null)}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="no-persona-selected">
                   <span className="icon">edit_note</span>
                   <p>Selecione uma persona para editar ou crie uma nova.</p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
      {isWizardOpen && <PersonaCreationWizard onClose={() => setIsWizardOpen(false)} />}
    </>
  );
};

export default PersonaManagementScreen;