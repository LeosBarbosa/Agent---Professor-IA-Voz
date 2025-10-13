/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useHistoryStore, useLogStore } from '../lib/state';
import c from 'classnames';
import { useLiveAPIProvider } from '../contexts/LiveAPIContext';
import React, { useState, useRef, useEffect, memo } from 'react';
import ConfirmationModal from './ConfirmationModal';

function Sidebar() {
  const { connected, disconnect, recordingStatus } = useLiveAPIProvider();

  const { getSortedConversations, loadConversation, deleteConversation, updateConversationTitle, togglePinConversation } = useHistoryStore();
  const { startNewConversation, currentConversationId } = useLogStore();
  const conversations = getSortedConversations();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);


  const handleStartNew = async () => {
    if (connected) {
      disconnect();
    }
    await startNewConversation();
  };

  const handleLoad = async (id: string) => {
    if (id === currentConversationId || loadingId) {
      return;
    }

    if (connected) {
      disconnect();
    }
    setLoadingId(id);
    await loadConversation(id);
    setLoadingId(null);
  };

  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return true;
    }

    const titleMatch = conv.title.toLowerCase().includes(query);
    if (titleMatch) {
      return true;
    }

    const contentMatch = conv.turns.some(turn =>
      turn.text.toLowerCase().includes(query)
    );
    return contentMatch;
  });

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      deleteConversation(confirmDeleteId);
    }
    setConfirmDeleteId(null);
  };
  
  const handlePinToggle = (id: string) => {
    togglePinConversation(id);
    setOpenMenuId(null);
  };

  const handleEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
    setOpenMenuId(null);
  };

  const handleSaveTitle = () => {
    if (editingId && editingTitle.trim()) {
      updateConversationTitle(editingId, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };
  
  return (
    <>
      <aside className="left-sidebar">
        <div className="sidebar-content">
          <div className="sidebar-section">
            <div className="history-header">
              <div className="history-title-with-icon">
                <span className="icon">forum</span>
                <h4 className="sidebar-section-title">Histórico</h4>
              </div>
              <button
                className="new-chat-button"
                onClick={handleStartNew}
                disabled={recordingStatus !== 'idle'}
                title="Iniciar nova conversa"
                aria-label="Iniciar nova conversa"
              >
                <span className="icon">add</span>
              </button>
            </div>
            <div className="history-search">
              <span className="icon">search</span>
              <input
                type="text"
                placeholder="Pesquisar conversas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={recordingStatus !== 'idle'}
              />
            </div>
            <div className="history-list">
              {filteredConversations.length > 0 ? (
                filteredConversations.map(conv => {
                  const isLoadingThisItem = loadingId === conv.id;
                  const isCurrentlyActive = conv.id === currentConversationId;
                  const isAnythingLoading = loadingId !== null;

                  return (
                  <div
                    key={conv.id}
                    className={c('history-item', {
                      active: isCurrentlyActive && !isAnythingLoading,
                      editing: editingId === conv.id,
                    })}
                  >
                    <div className="history-item-status">
                      {isLoadingThisItem && <span className="spinner history-spinner"></span>}
                      {isCurrentlyActive && !isAnythingLoading && <div className="active-indicator"></div>}
                    </div>
                    {editingId === conv.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={handleEditKeyDown}
                        className="history-item-input"
                      />
                    ) : (
                      <button
                        className="history-item-title"
                        onClick={() => handleLoad(conv.id)}
                        disabled={isAnythingLoading || recordingStatus !== 'idle'}
                        title={conv.title}
                      >
                        {conv.isPinned && <span className="icon pin-icon" title="Conversa Fixada">push_pin</span>}
                        <span>{conv.title}</span>
                      </button>
                    )}
                    <div className="history-item-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(prevId => prevId === conv.id ? null : conv.id)
                        }}
                        aria-label="Opções da conversa"
                        className="history-menu-button"
                        disabled={isAnythingLoading || recordingStatus !== 'idle'}
                      >
                        <span className="icon">more_vert</span>
                      </button>
                      {openMenuId === conv.id && (
                        <div className="history-item-menu" ref={menuRef}>
                          <button onClick={() => handlePinToggle(conv.id)}>
                            <span className="icon">{conv.isPinned ? 'do_not_disturb_on' : 'push_pin'}</span>
                            {conv.isPinned ? 'Desafixar' : 'Fixar'}
                          </button>
                          <button onClick={() => handleEdit(conv.id, conv.title)}>
                            <span className="icon">edit</span>
                            Renomear
                          </button>
                          <button className="delete-action" onClick={() => {
                            setConfirmDeleteId(conv.id);
                            setOpenMenuId(null);
                          }}>
                            <span className="icon">delete</span>
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )})
              ) : (
                <p className="no-history">Nenhuma conversa encontrada.</p>
              )}
            </div>
          </div>
        </div>
      </aside>
      {confirmDeleteId && (
        <ConfirmationModal
          title="Excluir Conversa"
          message="Tem certeza que deseja excluir esta conversa permanentemente? Esta ação não pode ser desfeita."
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
          confirmText="Excluir"
        />
      )}
    </>
  );
}

export default memo(Sidebar);