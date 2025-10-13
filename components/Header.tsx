/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Import React to be able to use React.MouseEvent type.
import React, { memo, useState } from 'react';
import { useUI, usePersonaStore, useLogStore, useHistoryStore, useSettings, useTools } from '../lib/state';
import { useLiveAPIProvider } from '../contexts/LiveAPIContext';
import { useGoogleDriveContext } from '../contexts/GoogleDriveContext';
import Modal from './Modal';
import ContextMenu, { ContextMenuItem } from './context-menu/ContextMenu';
import cn from 'classnames';

const ConfidenceMeter = memo(() => {
  const confidence = useUI(state => state.confidence);
  const activePersona = usePersonaStore(state => state.activePersona);

  if (activePersona?.id !== 'english-teacher') {
    return null;
  }

  const getConfidenceLabel = (score: number) => {
    if (score < 20) return 'Começando';
    if (score < 40) return 'Ganhando Ritmo';
    if (score < 60) return 'Soando Bem';
    if (score < 80) return 'Quase Lá';
    if (score < 100) return 'Fluente!';
    return 'Nível Máximo!';
  };

  const label = getConfidenceLabel(confidence);

  return (
    <div className="confidence-meter-container">
      <span className="confidence-meter-label">Confiança: {label}</span>
      <div className="confidence-meter-bar">
        <div
          className="confidence-meter-progress"
          style={{ width: `${confidence}%` }}
        ></div>
      </div>
    </div>
  );
});
ConfidenceMeter.displayName = 'ConfidenceMeter';

type ExportModalProps = {
  onClose: () => void;
  onSaveJson: () => void;
  onSaveTxt: () => void;
  onSaveMd: () => void;
  onSaveToDrive: () => void;
  isDriveEnabled: boolean;
  driveUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
};

function ExportModal({
  onClose,
  onSaveJson,
  onSaveTxt,
  onSaveMd,
  onSaveToDrive,
  isDriveEnabled,
  driveUploadStatus,
}: ExportModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="export-modal">
        <h2>Exportar Conversa</h2>
        <p className="export-modal-subtitle">
          Escolha um formato para salvar sua conversa. A sessão (.json) pode
          ser recarregada mais tarde.
        </p>
        <div className="export-options">
          <button
            onClick={() => {
              onSaveJson();
              onClose();
            }}
          >
            <span className="icon">data_object</span>
            Salvar Sessão (.json)
          </button>
          <button
            onClick={() => {
              onSaveToDrive();
            }}
            disabled={!isDriveEnabled || driveUploadStatus === 'uploading'}
            className="drive-export-button"
            data-status={driveUploadStatus}
          >
            {driveUploadStatus === 'uploading' ? (
              <span className="spinner-light" />
            ) : (
              <span className="icon google-drive-icon" />
            )}
            <span>
              {driveUploadStatus === 'idle' && 'Salvar no Google Drive'}
              {driveUploadStatus === 'uploading' && 'Salvando...'}
              {driveUploadStatus === 'success' && 'Salvo com sucesso!'}
              {driveUploadStatus === 'error' && 'Erro ao salvar'}
            </span>
          </button>
          <button
            onClick={() => {
              onSaveTxt();
              onClose();
            }}
          >
            <span className="icon">description</span>
            Exportar como Texto (.txt)
          </button>
          <button
            onClick={() => {
              onSaveMd();
              onClose();
            }}
          >
            <span className="icon">edit_document</span>
            Exportar como Markdown (.md)
          </button>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button">
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}


function Header() {
  const { toggleSettings, setView, togglePersonaManagement, toggleSearch, isPiPMode, togglePiPMode, isPresentationMode, togglePresentationMode, isFocusMode, toggleFocusMode, isSettingsOpen, isHistoryOpen, toggleHistory } = useUI();
  const { activePersona } = usePersonaStore();
  const { recordingStatus, connected, disconnect } = useLiveAPIProvider();
  
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [isResetPending, setIsResetPending] = useState(false);
  
  const hasAgentTurn = useLogStore(state =>
    state.turns.some(t => t.role === 'agent'),
  );

  const {
    isSignedIn,
    uploadFile,
  } = useGoogleDriveContext();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ visible: true, x: rect.left, y: rect.bottom + 5 });
  };
  
  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const getFilenameBase = () => {
    const { turns, currentConversationId } = useLogStore.getState();
    const { conversations } = useHistoryStore.getState();
    const currentConversation = conversations[currentConversationId];

    let baseTitle = 'conversa';
    if (
      currentConversation?.title &&
      currentConversation.title !== 'Nova Conversa'
    ) {
      baseTitle = currentConversation.title;
    } else {
      const firstUserTurn = turns.find(t => t.role === 'user');
      if (firstUserTurn) {
        baseTitle = firstUserTurn.text.substring(0, 30);
      }
    }
    return baseTitle.replace(/[\s\W_]+/g, '-').toLowerCase();
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSessionData = () => {
    const { systemPrompt, model } = useSettings.getState();
    const { tools } = useTools.getState();
    const { turns } = useLogStore.getState();

    if (turns.length === 0) {
      return null;
    }

    return {
      schemaVersion: '1.0',
      configuration: { model, systemPrompt },
      tools,
      conversation: turns.map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString(),
      })),
    };
  };

  const handleSaveSession = () => {
    const logData = getSessionData();
    if (!logData) {
      alert('A conversa está vazia. Não há nada para salvar.');
      return;
    }

    const filename = `${getFilenameBase()}_${new Date().toISOString().split('T')[0]}.json`;
    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    triggerDownload(blob, filename);
  };

  const handleSaveToDrive = async () => {
    const logData = getSessionData();
    if (!logData) {
      alert('A conversa está vazia. Não há nada para salvar.');
      return;
    }

    setDriveUploadStatus('uploading');
    try {
      const filename = `${getFilenameBase()}_${new Date().toISOString().split('T')[0]}.json`;
      const jsonString = JSON.stringify(logData, null, 2);
      await uploadFile(jsonString, filename);
      setDriveUploadStatus('success');
    } catch (error) {
      console.error('Falha ao salvar no Google Drive:', error);
      setDriveUploadStatus('error');
    }
  };

  const handleExportTxt = () => {
    const { turns } = useLogStore.getState();
    if (turns.length === 0) {
      alert('A conversa está vazia. Não há nada para salvar.');
      return;
    }
    const content = turns
      .map(
        t =>
          `[${t.timestamp.toLocaleTimeString()}] ${t.role.toUpperCase()}: ${
            t.text
          }`,
      )
      .join('\n\n');
    const filename = `${getFilenameBase()}_${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([content], { type: 'text/plain' });
    triggerDownload(blob, filename);
  };

  const handleExportMd = () => {
    const { turns } = useLogStore.getState();
    if (turns.length === 0) {
      alert('A conversa está vazia. Não há nada para salvar.');
      return;
    }
    const content = turns
      .map(
        t =>
          `**${t.role.toUpperCase()}** (*${t.timestamp.toLocaleTimeString()}*)\n\n${t.text.replace(
            /^/gm,
            '> ',
          )}`,
      )
      .join('\n\n---\n\n');
    const filename = `${getFilenameBase()}_${new Date().toISOString().split('T')[0]}.md`;
    const blob = new Blob([content], { type: 'text/markdown' });
    triggerDownload(blob, filename);
  };
  
  const handleResetClick = () => {
    if (window.confirm('Tem certeza que deseja limpar a conversa?')) {
      if (
        useLogStore.getState().turns.length > 0 &&
        window.confirm(
          'Você gostaria de salvar a conversa atual antes de limpar?',
        )
      ) {
        setIsResetPending(true);
        setIsExportModalOpen(true);
      } else {
        if (connected) {
          disconnect();
        }
        useLogStore.getState().clearTurns();
      }
    }
  };

  const getMenuItems = (): ContextMenuItem[] => {
    return [
      {
        label: isPiPMode ? 'Sair do PiP' : 'Entrar no PiP',
        icon: 'picture_in_picture_alt',
        onClick: togglePiPMode,
      },
      {
        label: isPresentationMode ? 'Sair da Apresentação' : 'Entrar na Apresentação',
        icon: isPresentationMode ? 'close_fullscreen' : 'present_to_all',
        onClick: togglePresentationMode,
        disabled: !hasAgentTurn,
      },
      {
        label: isFocusMode ? 'Sair do Foco' : 'Entrar no Foco',
        icon: isFocusMode ? 'fullscreen_exit' : 'center_focus_strong',
        onClick: toggleFocusMode,
      },
      {
        label: 'Exportar Conversa',
        icon: 'download',
        onClick: () => setIsExportModalOpen(true),
        disabled: !hasAgentTurn,
      },
      {
        label: 'Limpar Conversa',
        icon: 'refresh',
        onClick: handleResetClick,
        disabled: recordingStatus !== 'idle',
      }
    ];
  };

  if (!activePersona) return null;
  
  const { header } = activePersona;

  return (
    <>
    <header>
      <div className="header-left">
        <button
            className={cn("header-button", { active: isHistoryOpen })}
            onClick={toggleHistory}
            aria-label="Alternar histórico de conversas"
            title="Alternar histórico de conversas"
          >
            <span className="icon">menu</span>
          </button>
        <button
          className="header-button"
          onClick={() => setView('home')}
          aria-label="Início"
          title="Voltar para a seleção de personas"
          disabled={recordingStatus !== 'idle'}
        >
          <span className="icon">apps</span>
        </button>
        <div className="title-container">
          <h1>{header.title}</h1>
          <p>{header.subtitle}</p>
        </div>
      </div>
      <ConfidenceMeter />
      <div className="header-right">
        <button
          className="header-button"
          onClick={toggleSearch}
          aria-label="Pesquisar na conversa"
          title="Pesquisar na conversa"
          disabled={recordingStatus !== 'idle'}
        >
          <span className="icon">search</span>
        </button>
         <button
          className="header-button"
          onClick={handleContextMenu}
          aria-label="Mais Opções"
          title="Mais Opções"
        >
          <span className="icon">more_vert</span>
        </button>
        <button
          className={cn("header-button", { active: isSettingsOpen })}
          onClick={toggleSettings}
          aria-label="Configurações e Contexto"
          title="Configurações e Contexto"
          disabled={recordingStatus !== 'idle'}
        >
          <span className="icon">tune</span>
        </button>
        <button
          className="header-button"
          onClick={togglePersonaManagement}
          aria-label="Gerenciar Personas"
          title="Gerenciar Personas"
          disabled={recordingStatus !== 'idle'}
        >
          <span className="icon">settings</span>
        </button>
      </div>
    </header>
    {isExportModalOpen && (
        <ExportModal
          onClose={() => {
            setIsExportModalOpen(false);
            if (isResetPending) {
              if (connected) {
                disconnect();
              }
              useLogStore.getState().clearTurns();
              setIsResetPending(false);
            }
          }}
          onSaveJson={handleSaveSession}
          onSaveTxt={handleExportTxt}
          onSaveMd={handleExportMd}
          onSaveToDrive={handleSaveToDrive}
          isDriveEnabled={isSignedIn}
          driveUploadStatus={driveUploadStatus}
        />
      )}
      {contextMenu.visible && (
        <ContextMenu
          items={getMenuItems()}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
}

export default memo(Header);