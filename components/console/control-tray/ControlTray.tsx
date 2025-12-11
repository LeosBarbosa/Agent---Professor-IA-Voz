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
 * distributed under the License is distributed on an "ASIS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from 'classnames';

import React, { memo, ReactNode, useEffect, useRef, useState } from 'react';
import {
  useLogStore,
  useFileStore,
  useUI,
} from '../../../lib/state';

import { useLiveAPIProvider } from '../../../contexts/LiveAPIContext';
import Modal from '../../Modal';

// START of UploadModal component definition
type UploadModalProps = {
  onClose: () => void;
  onSendText: (text: string, image?: string | null) => void;
  initialTextContent?: string;
  initialImageContent?: string | null;
  initialImageName?: string;
};

function UploadModal({
  onClose,
  onSendText,
  initialTextContent = '',
  initialImageContent = null,
  initialImageName = '',
}: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('upload');
  const [textContent, setTextContent] = useState(initialTextContent);
  const [fileName, setFileName] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(
    initialImageContent,
  );
  const [imageName, setImageName] = useState(initialImageName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTextContent) {
      setActiveTab('paste');
    }
    if (initialImageContent) {
      // If we get an image, no need to keep the initial text
      // as the prompt will be constructed based on the image.
      // You can adjust this logic if both can coexist from a Drive file.
      setTextContent('');
    }
  }, [initialTextContent, initialImageContent]);

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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido.');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        setAttachedImage(e.target?.result as string);
        setImageName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if (textContent.trim() || attachedImage) {
      onSendText(textContent, attachedImage);
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
          Cole o texto, envie um arquivo ou anexe uma imagem para que a IA possa
          analisá-los.
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

        <div className="image-attachment-area">
          <h4>Anexar Imagem (Opcional)</h4>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button onClick={() => imageInputRef.current?.click()}>
            <span className="icon">add_photo_alternate</span>
            Selecionar Imagem
          </button>
          {attachedImage && (
            <div className="image-preview">
              <img src={attachedImage} alt={imageName || 'Prévia da imagem'} />
              <button
                className="remove-image-button"
                aria-label="Remover imagem anexada"
                onClick={() => {
                  setAttachedImage(null);
                  setImageName('');
                  if (imageInputRef.current) imageInputRef.current.value = '';
                }}
              >
                <span className="icon">close</span>
              </button>
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
            disabled={!textContent.trim() && !attachedImage}
          >
            Enviar para a IA
          </button>
        </div>
      </div>
    </Modal>
  );
}
// END of UploadModal component definition

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { files, clearFiles } = useFileStore();
  const {
    isAgentThinking,
    uploadModalState,
    openUploadModal,
    closeUploadModal,
  } = useUI();

  const {
    client,
    connected,
    connect,
    disconnect,
    muted,
    toggleMute,
    videoStream,
    toggleVideo,
    recordingStatus,
    toggleRecording,
    speakingTime,
  } = useLiveAPIProvider();

  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
        videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const addTurn = useLogStore(state => state.addTurn);

  const handleMicClick = async () => {
    if (connected) {
      toggleMute();
    } else {
      try {
        const success = await connect();
        if (!success) {
            console.error('Failed to connect via handleMicClick');
            return;
        }
        if (recordingStatus === 'idle') {
          // This recording is for saving the session, not just speaking.
          // We can decide if we want to auto-start it.
          // For now, let's leave it as a manual action if a button is added.
        }
        toggleMute();
      } catch (error) {
        console.error('Falha ao conectar o microfone:', error);
        // O ErrorScreen deve lidar com a exibição deste erro para o usuário.
      }
    }
  };

  const handleVideoClick = async () => {
     await toggleVideo();
  };

  const constructPrimingPrompt = (initialPrompt: string) => {
    const { turns } = useLogStore.getState();
    if (files.length === 0 || turns.length > 0) {
      return initialPrompt;
    }

    const fileContents = files
      .map(
        f => `---
**Arquivo: ${f.name}**

${f.content}
---`,
      )
      .join('\n\n');

    return `Antes de responder à minha primeira pergunta, primeiro leia e processe o conteúdo dos seguintes arquivos que estou fornecendo como contexto. Depois de processar os arquivos, sua primeira resposta deve começar com a frase "Contexto dos arquivos lido e compreendido." e, em seguida, prossiga para responder à minha pergunta.

${fileContents}

Minha primeira pergunta é: ${initialPrompt}`;
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;
  
    setIsSending(true);
    setInputText('');
    const fullPrompt = constructPrimingPrompt(text);
  
    try {
      // Conecta à API Live se ainda não estiver conectado.
      if (!connected) {
        const success = await connect();
        if (!success) {
            // Se a conexão falhar, interrompe o fluxo para evitar erros em cascata
            // e o loop "Max update depth exceeded" causado por re-renderizações e eventos de erro.
            setIsSending(false);
            return;
        }
      }
      
      // Adiciona o turno do usuário ao log da conversa.
      addTurn({ role: 'user', text: fullPrompt, isFinal: true });
  
      // Envia o prompt de texto através do cliente da API Live.
      client.send({ text: fullPrompt });
  
      // Limpa os arquivos de contexto se este for o primeiro turno da conversa.
      if (files.length > 0 && useLogStore.getState().turns.length <= 1) {
        clearFiles();
      }
  
    } catch (error) {
      console.error('Falha ao conectar ou enviar texto via API Live:', error);
      // O erro será tratado pelo ErrorScreen global através dos eventos do cliente.
    } finally {
      setIsSending(false);
    }
  };


  const handleSendTextFromFile = async (
    textContent: string,
    imageContent?: string | null,
  ) => {
    if ((!textContent.trim() && !imageContent) || isSending) return;

    setIsSending(true);
    closeUploadModal();
    try {
      let justConnected = false;
      if (!connected) {
        const success = await connect();
        if (!success) {
            setIsSending(false);
            return;
        }
        justConnected = true;
      }

      if (justConnected && recordingStatus === 'idle') {
        toggleRecording();
      }

      let message;
      if (textContent && imageContent) {
        message = `Eu li o seguinte texto e anexei uma imagem. Por favor, analise ambos e prepare-se para discuti-los comigo:\n\n---\n${textContent}\n---`;
      } else if (textContent) {
        message = `Eu li o seguinte texto. Por favor, analise-o e prepare-se para discuti-lo comigo:\n\n---\n${textContent}\n---`;
      } else {
        message = `Anexei a seguinte imagem. Por favor, analise-a e prepare-se para discuti-la comigo.`;
      }

      const fullPrompt = constructPrimingPrompt(message);

      addTurn({
        role: 'user',
        text: fullPrompt,
        image: imageContent,
        isFinal: true,
      });

      const parts: any[] = [{ text: fullPrompt }];
      if (imageContent) {
        // Assuming imageContent is a data URL like "data:image/jpeg;base64,..."
        const [meta, base64Data] = imageContent.split(',');
        const mimeType = meta.split(':')[1].split(';')[0];
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        });
      }

      client.send(parts);

      if (files.length > 0 && useLogStore.getState().turns.length <= 1) {
        clearFiles();
      }
    } catch (error) {
      console.error('Falha ao conectar ou enviar arquivo:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const isRecording = recordingStatus === 'recording';

  const micButtonTitle = connected
    ? muted
      ? 'Ativar microfone'
      : 'Desativar microfone'
    : 'Conectar e iniciar microfone';
    
  const videoButtonTitle = videoStream ? 'Desativar câmera' : 'Ativar câmera';

  const connectButtonTitle = connected ? 'Parar streaming' : 'Iniciar streaming';

  return (
    <>
      <section className="chat-input-area">
        <div className="chat-controls-top-row">
          <div className="chat-input-actions">
            <button
              className={cn('action-button', { loading: isSending })}
              onClick={() => openUploadModal({})}
              aria-label="Anexar arquivo"
              title="Anexar arquivo ou texto"
              disabled={isSending || recordingStatus !== 'idle'}
            >
              <span className="icon">attach_file</span>
            </button>
            <button
              className={cn('action-button mic-button', { muted, connected })}
              onClick={handleMicClick}
              title={micButtonTitle}
              aria-label={micButtonTitle}
            >
              {!muted ? (
                <span className="material-symbols-outlined filled">mic</span>
              ) : (
                <span className="material-symbols-outlined filled">mic_off</span>
              )}
            </button>
            <button
              className={cn('action-button', { active: !!videoStream })}
              onClick={handleVideoClick}
              title={videoButtonTitle}
              aria-label={videoButtonTitle}
              disabled={!connected}
            >
               <span className="material-symbols-outlined filled">
                {videoStream ? 'videocam_off' : 'videocam'}
               </span>
            </button>
            {videoStream && (
                <div className="video-preview-container">
                    <video ref={videoPreviewRef} autoPlay muted playsInline className="video-preview" />
                </div>
            )}
          </div>
          <div className="session-controls">
            {connected && !muted && (
                <div className="recording-timer">
                  <span className="icon">fiber_manual_record</span>
                  {formatRecordingTime(speakingTime)}
                </div>
              )}
            <button
              className={cn('connect-button', { connected })}
              onClick={connected ? disconnect : connect}
              title={connectButtonTitle}
              aria-label={connectButtonTitle}
              disabled={recordingStatus !== 'idle'}
            >
              <span className="material-symbols-outlined filled">
                {connected ? 'pause_circle' : 'play_circle'}
              </span>
              <span>{connected ? 'Conectado' : 'Desconectado'}</span>
            </button>
          </div>
        </div>
        <form
          className={cn('text-input-form', { 'agent-thinking': isAgentThinking })}
          onSubmit={handleTextSubmit}
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              isAgentThinking ? 'Agente pensando...' : 'Digite uma mensagem...'
            }
            disabled={(isRecording && !muted) || isAgentThinking}
          />
          <button
            type="submit"
            disabled={
              !inputText.trim() ||
              (isRecording && !muted) ||
              isSending ||
              isAgentThinking
            }
            title={isAgentThinking ? 'Aguarde o agente' : 'Enviar mensagem'}
            aria-label={isAgentThinking ? 'Aguarde o agente' : 'Enviar mensagem'}
            className={cn({ loading: isSending })}
          >
            {isAgentThinking ? (
              <div className="agent-thinking-indicator">
                <span />
                <span />
                <span />
              </div>
            ) : isSending ? (
              <span className="spinner"></span>
            ) : (
              <span className="icon">send</span>
            )}
          </button>
        </form>
      </section>
      {uploadModalState.isOpen && (
        <UploadModal
          onClose={closeUploadModal}
          onSendText={handleSendTextFromFile}
          initialTextContent={uploadModalState.initialTextContent}
          initialImageContent={uploadModalState.initialImageContent}
          initialImageName={uploadModalState.initialImageName}
        />
      )}
    </>
  );
}

export default memo(ControlTray);