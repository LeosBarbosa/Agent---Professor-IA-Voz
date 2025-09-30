/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from 'classnames';

import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import {
  useSettings,
  useTools,
  useLogStore,
  ConversationTurn,
} from '@/lib/state';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import Modal from '../../Modal';

// START of new UploadModal component definition
type UploadModalProps = {
  onClose: () => void;
  onSendText: (text: string) => void;
};

function UploadModal({ onClose, onSendText }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('text/')) {
        alert(
          'Por favor, selecione um arquivo de texto válido (ex: .txt, .md, .csv).',
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        setTextContent(text);
        setFileName(file.name);
      };
      reader.onerror = () => {
        alert('Erro ao ler o arquivo.');
        setFileName('');
        setTextContent('');
      };
      reader.readAsText(file);
    }
  };

  const handleSend = () => {
    if (textContent.trim()) {
      onSendText(textContent);
    }
  };

  const handleLabelClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal onClose={onClose}>
      <div className="upload-modal">
        <h2>Enviar Conteúdo para a IA</h2>
        <p className="upload-modal-subtitle">
          Cole o texto ou envie um arquivo para que a IA possa lê-lo e
          analisá-lo.
        </p>

        <div className="upload-modal-tabs">
          <button
            className={cn('tab-button', { active: activeTab === 'paste' })}
            onClick={() => setActiveTab('paste')}
          >
            Colar Texto
          </button>
          <button
            className={cn('tab-button', { active: activeTab === 'upload' })}
            onClick={() => setActiveTab('upload')}
          >
            Enviar Arquivo
          </button>
        </div>

        <div className="upload-modal-content">
          {activeTab === 'paste' && (
            <textarea
              placeholder="Cole seu texto aqui..."
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
            />
          )}
          {activeTab === 'upload' && (
            <div className="file-upload-area">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.md,.csv,.json,.html,.xml,text/plain"
                style={{ display: 'none' }}
              />
              <button className="file-upload-button" onClick={handleLabelClick}>
                <span className="icon">upload_file</span>
                Escolher Arquivo
              </button>
              {fileName && (
                <p className="file-name-display">
                  Arquivo selecionado: <strong>{fileName}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            className="save-button"
            disabled={!textContent.trim()}
          >
            Enviar para a IA
          </button>
        </div>
      </div>
    </Modal>
  );
}
// END of new UploadModal component definition

const formatTimestamp = (date: Date) => {
  const pad = (num: number, size = 2) => num.toString().padStart(size, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
};

const formatTurnsToTxt = (turns: ConversationTurn[]): string => {
  const header = `Transcrição da Conversa\nData: ${new Date().toLocaleString()}\n\n---\n\n`;
  const content = turns
    .map(turn => {
      const timestamp = formatTimestamp(turn.timestamp);
      const role = turn.role.charAt(0).toUpperCase() + turn.role.slice(1);
      const text = turn.text.trim();
      return `[${timestamp}] ${role}:\n${text}`;
    })
    .join('\n\n---\n\n');
  return header + content;
};

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const [inputText, setInputText] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const { client, connected, connect, disconnect } = useLiveAPIContext();
  const addTurn = useLogStore(state => state.addTurn);

  useEffect(() => {
    // FIX: Cannot find name 'connectButton'. Did you mean 'connectButtonRef'?
    if (!connected && connectButtonRef.current) {
      // FIX: Cannot find name 'connectButton'. Did you mean 'connectButtonRef'?
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    if (!connected) {
      setMuted(false);
      setIsRecording(false);
    }
  }, [connected]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, muted, audioRecorder]);

  const handleMicClick = () => {
    if (connected) {
      setMuted(!muted);
    } else {
      connect();
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    try {
      if (!connected) {
        await connect();
      }

      addTurn({ role: 'user', text, isFinal: true });
      client.send({ text });
      setInputText('');
    } catch (error) {
      console.error('Falha ao conectar ou enviar mensagem:', error);
      // O ErrorScreen deve lidar com a exibição deste erro.
    }
  };

  const handleSendTextFromFile = async (textContent: string) => {
    if (!textContent.trim()) return;

    try {
      if (!connected) {
        await connect();
      }

      const formattedMessage = `Eu li o seguinte texto. Por favor, analise-o e prepare-se para discuti-lo comigo:\n\n---\n${textContent}\n---`;

      addTurn({ role: 'user', text: formattedMessage, isFinal: true });
      client.send({ text: formattedMessage });
      setIsUploadModalOpen(false); // Close modal
    } catch (error) {
      console.error('Falha ao conectar ou enviar arquivo de texto:', error);
    }
  };

  const handleExportLogs = () => {
    const { systemPrompt, model } = useSettings.getState();
    const { tools } = useTools.getState();
    const { turns } = useLogStore.getState();

    const logData = {
      configuration: {
        model,
        systemPrompt,
      },
      tools,
      conversation: turns.map(turn => ({
        ...turn,
        // Convert Date object to ISO string for JSON serialization
        timestamp: turn.timestamp.toISOString(),
      })),
    };

    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `live-api-logs-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      const { turns } = useLogStore.getState();
      if (turns.length > 0) {
        const formattedTranscript = formatTurnsToTxt(turns);
        const blob = new Blob([formattedTranscript], {
          type: 'text/plain;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `transcript-${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
    setIsRecording(!isRecording);
  };

  const micButtonTitle = connected
    ? muted
      ? 'Ativar microfone'
      : 'Desativar microfone'
    : 'Conectar e iniciar microfone';

  const connectButtonTitle = connected ? 'Parar streaming' : 'Iniciar streaming';

  return (
    <>
      <section className="control-tray">
        <nav className={cn('actions-nav')}>
          <button
            className={cn('action-button mic-button')}
            onClick={handleMicClick}
            title={micButtonTitle}
            disabled={!connected && isRecording}
          >
            {!muted ? (
              <span className="material-symbols-outlined filled">mic</span>
            ) : (
              <span className="material-symbols-outlined filled">mic_off</span>
            )}
          </button>
          <button
            className={cn('action-button', 'record-button', {
              recording: isRecording,
            })}
            onClick={handleToggleRecording}
            aria-label={
              isRecording ? 'Parar gravação' : 'Gravar transcrição'
            }
            title={
              isRecording
                ? 'Parar gravação e baixar'
                : 'Gravar transcrição da conversa'
            }
          >
            <span className="icon">fiber_manual_record</span>
          </button>
          <button
            className={cn('action-button')}
            onClick={() => setIsUploadModalOpen(true)}
            aria-label="Enviar arquivo ou texto"
            title="Enviar arquivo ou texto"
          >
            <span className="icon">attach_file</span>
          </button>
          <button
            className={cn('action-button')}
            onClick={handleExportLogs}
            aria-label="Exportar Logs"
            title="Exportar logs da sessão"
          >
            <span className="icon">download</span>
          </button>
          <button
            className={cn('action-button')}
            onClick={useLogStore.getState().clearTurns}
            aria-label="Redefinir Conversa"
            title="Redefinir logs da sessão"
          >
            <span className="icon">refresh</span>
          </button>
          {children}
        </nav>

        <form className="text-input-form" onSubmit={handleTextSubmit}>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Digite uma mensagem..."
            disabled={isRecording}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isRecording}
            title="Enviar mensagem"
          >
            <span className="icon">send</span>
          </button>
        </form>

        <div className={cn('connection-container', { connected })}>
          <div className="connection-button-container">
            <button
              ref={connectButtonRef}
              className={cn('action-button connect-toggle', { connected })}
              onClick={connected ? disconnect : connect}
              title={connectButtonTitle}
              disabled={isRecording}
            >
              <span className="material-symbols-outlined filled">
                {connected ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>
          <span className="text-indicator">Transmitindo</span>
        </div>
      </section>
      {isUploadModalOpen && (
        <UploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onSendText={handleSendTextFromFile}
        />
      )}
    </>
  );
}

export default memo(ControlTray);