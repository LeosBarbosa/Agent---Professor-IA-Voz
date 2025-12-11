/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useHistoryStore, useLogStore, ConversationTurn } from '../lib/state';
import c from 'classnames';
import { useLiveAPIProvider } from '../contexts/LiveAPIContext';
import React, { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import ConfirmationModal from './ConfirmationModal';

interface HistoryListProps {
  conversations: any[];
  currentConversationId: string;
  loadingId: string | null;
  recordingStatus: string;
  onLoad: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  searchQuery: string;
}

const HistoryList = memo(({ 
  conversations, 
  currentConversationId, 
  loadingId, 
  recordingStatus,
  onLoad, 
  onEdit, 
  onDelete,
  onPin,
  searchQuery
}: HistoryListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  const handleEditStart = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
    setOpenMenuId(null);
  };

  const handleSaveTitle = (id: string) => {
    if (editingId === id && editingTitle.trim()) {
      onEdit(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      handleSaveTitle(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const titleMatch = conv.title.toLowerCase().includes(query);
      if (titleMatch) return true;
      const contentMatch = conv.turns.some((turn: ConversationTurn) =>
        turn.text.toLowerCase().includes(query)
      );
      return contentMatch;
    });
  }, [conversations, searchQuery]);

  if (filteredConversations.length === 0) {
    return <p className="no-history">Nenhuma conversa encontrada.</p>;
  }

  return (
    <div className="history-list">
      {filteredConversations.map(conv => {
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
                onBlur={() => handleSaveTitle(conv.id)}
                onKeyDown={(e) => handleEditKeyDown(e, conv.id)}
                className="history-item-input"
              />
            ) : (
              <button
                className="history-item-title"
                onClick={() => onLoad(conv.id)}
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
                  <button onClick={() => { onPin(conv.id); setOpenMenuId(null); }}>
                    <span className="icon">{conv.isPinned ? 'do_not_disturb_on' : 'push_pin'}</span>
                    {conv.isPinned ? 'Desafixar' : 'Fixar'}
                  </button>
                  <button onClick={() => handleEditStart(conv.id, conv.title)}>
                    <span className="icon">edit</span>
                    Renomear
                  </button>
                  <button className="delete-action" onClick={() => {
                    onDelete(conv.id);
                    setOpenMenuId(null);
                  }}>
                    <span className="icon">delete</span>
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

HistoryList.displayName = 'HistoryList';

function Sidebar() {
  const { connected, disconnect, recordingStatus } = useLiveAPIProvider();
  const { getSortedConversations, loadConversation, deleteConversation, updateConversationTitle, togglePinConversation, conversations: allConversations } = useHistoryStore();
  const { startNewConversation, currentConversationId } = useLogStore();
  
  const conversations = useMemo(() => getSortedConversations(), [allConversations, getSortedConversations]);

  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleStartNew = useCallback(async () => {
    if (connected) {
      disconnect();
    }
    await startNewConversation();
  }, [connected, disconnect, startNewConversation]);

  const handleLoad = useCallback(async (id: string) => {
    if (id === currentConversationId || loadingId) {
      return;
    }
    if (connected) {
      disconnect();
    }
    setLoadingId(id);
    await loadConversation(id);
    setLoadingId(null);
  }, [currentConversationId, loadingId, connected, disconnect, loadConversation]);

  const handleConfirmDelete = useCallback(() => {
    if (confirmDeleteId) {
      deleteConversation(confirmDeleteId);
    }
    setConfirmDeleteId(null);
  }, [confirmDeleteId, deleteConversation]);
  
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
            
            <HistoryList 
              conversations={conversations}
              currentConversationId={currentConversationId}
              loadingId={loadingId}
              recordingStatus={recordingStatus}
              searchQuery={searchQuery}
              onLoad={handleLoad}
              onEdit={updateConversationTitle}
              onDelete={setConfirmDeleteId}
              onPin={togglePinConversation}
            />
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