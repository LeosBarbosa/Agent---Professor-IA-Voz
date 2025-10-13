/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Persona, usePersonaStore } from '../../../lib/state';

interface PersonaEditorProps {
  persona: Persona;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const PersonaEditor: React.FC<PersonaEditorProps> = ({ persona, onCancel, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Persona>>(persona);
  const { updatePersona } = usePersonaStore();

  useEffect(() => {
    setFormData(persona);
  }, [persona]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isRange = e.target.type === 'range';
    setFormData(prev => ({ ...prev, [name]: isRange ? parseFloat(value) : value }));
  };

  const handleSave = () => {
    updatePersona(persona.id, formData);
    onCancel(); // Close editor after saving
  };
  
  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir a persona "${persona.name}"?`)) {
      onDelete(persona.id);
    }
  }

  return (
    <div className="persona-editor-form">
      <label>
        Nome da Persona
        <input name="name" value={formData.name || ''} onChange={handleChange} />
      </label>
      <label>
        Ícone (Material Symbols)
        <input name="icon" value={formData.icon || ''} onChange={handleChange} placeholder="ex: smart_toy" />
      </label>
      <label>
        Slogan (breve descrição para o cartão)
        <input name="tagline" value={formData.tagline || ''} onChange={handleChange} />
      </label>
      <label>
        Velocidade da Fala: {formData.speechRate?.toFixed(2) || '1.00'}x
        <input
            type="range"
            name="speechRate"
            min="0.75"
            max="1.25"
            step="0.05"
            value={formData.speechRate || 1.0}
            onChange={handleChange}
        />
      </label>
      <label>
        Prompt do Sistema (Instruções da IA)
        <textarea name="systemPrompt" value={formData.systemPrompt || ''} onChange={handleChange} rows={10} />
      </label>
      <div className="persona-editor-actions">
        <button 
          className="delete-persona-button"
          onClick={handleDelete}
          disabled={persona.isDefault}
          title={persona.isDefault ? "Personas padrão não podem ser excluídas" : "Excluir persona"}
        >
          Excluir
        </button>
        <div className="save-actions">
          <button className="cancel-persona-button" onClick={onCancel}>Cancelar</button>
          <button className="save-persona-button" onClick={handleSave}>Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
};

export default PersonaEditor;