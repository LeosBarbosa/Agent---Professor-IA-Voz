/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Persona, usePersonaStore, FunctionCall } from '../../../lib/state';
import ToolEditorModal from '../ToolEditorModal';
import { FunctionResponseScheduling } from '@google/genai';


interface PersonaEditorProps {
  persona: Persona;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const PersonaEditor: React.FC<PersonaEditorProps> = ({ persona, onCancel, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Persona>>(persona);
  const { updatePersona } = usePersonaStore();
  const [editingTool, setEditingTool] = useState<FunctionCall | null>(null);
  const [originalToolName, setOriginalToolName] = useState<string | null>(null);

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

  const handleToolAdd = () => {
    const newTool: FunctionCall = {
        name: `nova_funcao_${Date.now()}`,
        description: 'Uma nova função.',
        parameters: { type: 'OBJECT', properties: {} },
        isEnabled: true,
        scheduling: FunctionResponseScheduling.INTERRUPT,
    };
    setFormData(prev => ({
        ...prev,
        tools: [...(prev.tools || []), newTool]
    }));
    setOriginalToolName(newTool.name);
    setEditingTool(newTool);
  };

  const handleToolDelete = (name: string) => {
      setFormData(prev => ({
          ...prev,
          tools: (prev.tools || []).filter(t => t.name !== name)
      }));
  };
  
  const handleEditTool = (tool: FunctionCall) => {
    setOriginalToolName(tool.name);
    setEditingTool(tool);
  };

  const handleToolSave = (updatedTool: FunctionCall) => {
      if (!originalToolName) return;

      setFormData(prev => ({
          ...prev,
          tools: (prev.tools || []).map(t =>
              t.name === originalToolName ? updatedTool : t
          )
      }));
      setEditingTool(null);
      setOriginalToolName(null);
  };


  return (
    <>
      <div className="persona-editor-form">
        <label>
          Nome da Persona
          <input name="name" value={formData.name || ''} onChange={handleChange} />
        </label>
        <label>
          Ícone (Material Symbols)
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="icon" style={{ fontSize: '32px', color: 'var(--accent-blue-active)' }}>{formData.icon || 'help'}</span>
            <input name="icon" value={formData.icon || ''} onChange={handleChange} placeholder="ex: smart_toy" style={{ flexGrow: 1 }} />
            <a href="https://fonts.google.com/icons" target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent-blue)', whiteSpace: 'nowrap' }}>Lista de Ícones</a>
          </div>
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

        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Ferramentas (Chamadas de Função)</h4>
          <div className="tool-list">
          {(formData.tools || []).map(tool => (
              <div key={tool.name} className="tool-item">
                  <span className="tool-name-text" title={tool.name}>{tool.name}</span>
                  <div className="tool-actions">
                      <button onClick={() => handleEditTool(tool)} title="Editar ferramenta" aria-label={`Editar ferramenta ${tool.name}`}>
                        <span className="icon">edit</span>
                      </button>
                      <button onClick={() => handleToolDelete(tool.name)} title="Remover ferramenta" aria-label={`Remover ferramenta ${tool.name}`}>
                        <span className="icon">delete</span>
                      </button>
                  </div>
              </div>
          ))}
          </div>
          <button className="add-tool-button" onClick={handleToolAdd}>
              <span className="icon">add</span> Adicionar Ferramenta
          </button>
        </div>


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

      {editingTool && (
        <ToolEditorModal
            tool={editingTool}
            onClose={() => setEditingTool(null)}
            onSave={handleToolSave}
        />
      )}
    </>
  );
};

export default PersonaEditor;