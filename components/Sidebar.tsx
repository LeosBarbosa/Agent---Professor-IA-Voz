/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FunctionCall, useSettings, useUI, useTools, Template, useHistoryStore, useLogStore } from '@/lib/state';
import c from 'classnames';
import { AVAILABLE_VOICES } from '@/lib/constants';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import { useState } from 'react';
import ToolEditorModal from './ToolEditorModal';

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const { systemPrompt, voice, setSystemPrompt, setVoice } =
    useSettings();
  const { tools, template, setTemplate, toggleTool, addTool, removeTool, updateTool } = useTools();
  const { connected } = useLiveAPIContext();

  const [editingTool, setEditingTool] = useState<FunctionCall | null>(null);

  // New hooks for history
  const { getSortedConversations, loadConversation, deleteConversation } = useHistoryStore();
  const { startNewConversation, currentConversationId } = useLogStore();
  const conversations = getSortedConversations();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveTool = (updatedTool: FunctionCall) => {
    if (editingTool) {
      updateTool(editingTool.name, updatedTool);
    }
    setEditingTool(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conversa?')) {
      deleteConversation(id);
    }
  };

  return (
    <>
      <aside className={c('sidebar', { open: isSidebarOpen })}>
        <div className="sidebar-header">
          <h3>Configurações</h3>
          <button onClick={toggleSidebar} className="close-button">
            <span className="icon">close</span>
          </button>
        </div>
        <div className="sidebar-content">
          <div className="sidebar-section">
            <div className="history-header">
              <h4 className="sidebar-section-title">Histórico</h4>
              <button
                className="new-chat-button"
                onClick={startNewConversation}
                disabled={connected}
                title="Iniciar nova conversa"
              >
                <span className="icon">add_comment</span>
              </button>
            </div>
            <div className="history-search">
              <span className="icon">search</span>
              <input
                type="text"
                placeholder="Pesquisar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={connected}
              />
            </div>
            <div className="history-list">
              {conversations.length === 0 ? (
                <p className="no-history">Nenhuma conversa salva.</p>
              ) : filteredConversations.length === 0 ? (
                <p className="no-history">Nenhuma conversa encontrada.</p>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    className={c('history-item', {
                      active: conv.id === currentConversationId,
                    })}
                  >
                    <button
                      className="history-item-title"
                      onClick={() => loadConversation(conv.id)}
                      disabled={connected}
                    >
                      {conv.title}
                    </button>
                    <div className="history-item-actions">
                      <button
                        onClick={() => handleDelete(conv.id)}
                        disabled={connected}
                        aria-label={`Excluir ${conv.title}`}
                      >
                        <span className="icon">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Configuração da Persona</h4>
            <fieldset disabled={connected}>
              <label>
                Persona
                <select value={template} onChange={e => setTemplate(e.target.value as Template)}>
                  <option value="english-teacher">Professor de Inglês</option>
                  <option value="industrial-professor">Consultor de Indústria</option>
                </select>
              </label>
              <label>
                Prompt do Sistema
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={10}
                  placeholder="Descreva o papel e a personalidade da IA..."
                />
              </label>
              <label>
                Voz
                <select value={voice} onChange={e => setVoice(e.target.value)}>
                  {AVAILABLE_VOICES.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          </div>
          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Ferramentas</h4>
            <div className="tools-list">
              {tools.map(tool => (
                <div key={tool.name} className="tool-item">
                  <label className="tool-checkbox-wrapper">
                    <input
                      type="checkbox"
                      id={`tool-checkbox-${tool.name}`}
                      checked={tool.isEnabled}
                      onChange={() => toggleTool(tool.name)}
                      disabled={connected}
                    />
                    <span className="checkbox-visual"></span>
                  </label>
                  <label
                    htmlFor={`tool-checkbox-${tool.name}`}
                    className="tool-name-text"
                  >
                    {tool.name}
                  </label>
                  <div className="tool-actions">
                    <button
                      onClick={() => setEditingTool(tool)}
                      disabled={connected}
                      aria-label={`Editar ${tool.name}`}
                    >
                      <span className="icon">edit</span>
                    </button>
                    <button
                      onClick={() => removeTool(tool.name)}
                      disabled={connected}
                      aria-label={`Excluir ${tool.name}`}
                    >
                      <span className="icon">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addTool}
              className="add-tool-button"
              disabled={connected}
            >
              <span className="icon">add</span> Adicionar chamada de função
            </button>
          </div>
        </div>
      </aside>
      {editingTool && (
        <ToolEditorModal
          tool={editingTool}
          onClose={() => setEditingTool(null)}
          onSave={handleSaveTool}
        />
      )}
    </>
  );
}