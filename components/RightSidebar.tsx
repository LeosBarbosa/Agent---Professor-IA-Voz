/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FunctionCall, useSettings, useUI, useTools, usePersonaStore } from '../lib/state';
import c from 'classnames';
import { MALE_VOICES, FEMALE_VOICES } from '../lib/constants';
import { useLiveAPIProvider } from '../contexts/LiveAPIContext';
import { useGoogleDriveContext } from '../contexts/GoogleDriveContext';
import React, { useState, useEffect, memo, useMemo } from 'react';
import ToolEditorModal from './ToolEditorModal';

const FOLDER_NAME = 'Base de Conhecimento - Projetos';

function KnowledgeBaseSection() {
  const {
    isSignedIn,
    findFolderByName,
    createFolder,
    listFiles,
    downloadFileContent,
  } = useGoogleDriveContext();
  const { openUploadModal } = useUI();

  const [folder, setFolder] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolderAndFiles = async () => {
    if (!isSignedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const foundFolder = await findFolderByName(FOLDER_NAME);
      setFolder(foundFolder);
      if (foundFolder) {
        const fileList = await listFiles(foundFolder.id);
        setFiles(fileList);
      }
    } catch (err) {
      console.error('Erro ao buscar a base de conhecimento:', err);
      setError('Não foi possível carregar a base de conhecimento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
        fetchFolderAndFiles();
    } else {
        setIsLoading(false);
    }
  }, [isSignedIn]);

  const handleCreateFolder = async () => {
    setIsLoading(true);
    try {
      const newFolder = await createFolder(FOLDER_NAME);
      setFolder(newFolder);
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
      setError('Não foi possível criar a pasta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = async (file: any) => {
    if (!file.mimeType.startsWith('image/') && !file.mimeType.startsWith('text/')) {
        alert('Este tipo de arquivo não é suportado para visualização direta. O suporte para PDFs e outros formatos será adicionado em breve.');
        return;
    }

    try {
      const blob = await downloadFileContent(file.id);
      
      if (file.mimeType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          openUploadModal({ image: reader.result as string, imageName: file.name });
        };
        reader.readAsDataURL(blob);
      } else { // text file
        const text = await blob.text();
        openUploadModal({ text, imageName: file.name });
      }
    } catch (err) {
      console.error('Erro ao baixar o arquivo:', err);
      alert('Não foi possível carregar o conteúdo do arquivo.');
    }
  };

  if (!isSignedIn) {
    return null;
  }
  
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return 'grid_on';
    if (mimeType.includes('document')) return 'description';
    if (mimeType.includes('presentation')) return 'slideshow';
    return 'article';
  };
  
  return (
    <div className="sidebar-section">
        <div className="knowledge-base-header">
            <h4 className="sidebar-section-title">Base de Conhecimento</h4>
            <button onClick={fetchFolderAndFiles} disabled={isLoading} className="refresh-kb-button" title="Atualizar arquivos">
                <span className={c("icon", { "spinning": isLoading })}>refresh</span>
            </button>
        </div>
      <p className="knowledge-base-description">
        Personas como o "Assistente de Projetos" podem pesquisar arquivos nesta pasta do seu Drive para responder perguntas.
      </p>
      {isLoading ? (
        <div className="knowledge-base-loading">
          <span className="spinner"></span>
          <p>Sincronizando com o Drive...</p>
        </div>
      ) : error ? (
        <p className="no-history">{error}</p>
      ) : !folder ? (
        <div className="knowledge-base-setup">
          <p>A pasta <strong>{FOLDER_NAME}</strong> não foi encontrada em seu Drive.</p>
          <button onClick={handleCreateFolder}>
            <span className="icon">create_new_folder</span>
            Criar Pasta
          </button>
        </div>
      ) : (
        <div className="knowledge-base-files">
          {files.length === 0 ? (
            <p className="no-history">Nenhum arquivo encontrado. Adicione documentos à sua pasta no Google Drive.</p>
          ) : (
            files.map(file => (
              <button key={file.id} className="knowledge-file-item" onClick={() => handleFileClick(file)} title={`Carregar ${file.name} para o chat manualmente`}>
                <span className="icon file-icon">{getFileIcon(file.mimeType)}</span>
                <div className="file-info">
                   <span className="file-name">{file.name}</span>
                   <span className="file-modified">
                    Modificado: {new Date(file.modifiedTime).toLocaleDateString()}
                   </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RightSidebar() {
  const { toggleSettings } = useUI();
  const {
    systemPrompt,
    voice,
    voiceGender,
    speechRate,
    setSystemPrompt,
    setVoice,
    setVoiceGender,
    setSpeechRate,
    debugMode,
    toggleDebugMode,
    readAloud,
    setReadAloud,
  } = useSettings();
  const { tools: rawTools, setTools, toggleTool, addTool, removeTool, updateTool } = useTools();
  const { personas, activePersona, setActivePersonaById } = usePersonaStore();
  const { connected, disconnect } = useLiveAPIProvider();
  const {
    isSignedIn,
    profile,
    handleAuthClick,
    handleSignoutClick,
    isDriveApiReady,
  } = useGoogleDriveContext();

  const [editingTool, setEditingTool] = useState<FunctionCall | null>(null);
  const [isChangingPersona, setIsChangingPersona] = useState(false);

  const functionDeclarations = useMemo(() => {
    if (rawTools && Array.isArray(rawTools) && rawTools[0]?.functionDeclarations) {
      return rawTools[0].functionDeclarations as FunctionCall[];
    }
    return [];
  }, [rawTools]);

  const hasGoogleSearch = useMemo(() => {
    return !!(rawTools && Array.isArray(rawTools) && rawTools[0]?.googleSearch);
  }, [rawTools]);


  useEffect(() => {
    if (activePersona) {
      setTools(activePersona.tools);
    }
  }, [activePersona, setTools]);

  const handleSaveTool = (updatedTool: FunctionCall) => {
    if (editingTool) {
      updateTool(editingTool.name, updatedTool);
    }
    setEditingTool(null);
  };
  
  const handlePersonaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPersonaId = e.target.value;
    if (newPersonaId === activePersona?.id) {
      return;
    }
    
    if (window.confirm('Mudar de persona irá iniciar uma nova conversa. Deseja continuar?')) {
      setIsChangingPersona(true);
      if (connected) {
        disconnect();
      }
      setActivePersonaById(newPersonaId);
      setIsChangingPersona(false);
    } else {
      e.target.value = activePersona?.id || '';
    }
  };

  const handleAddNewTool = () => {
    const newTool = addTool();
    setEditingTool(newTool);
  };
  
  return (
    <>
      <aside className="right-sidebar">
        <div className="sidebar-header">
          <h3>Configurações e Contexto</h3>
          <button onClick={toggleSettings} className="close-button" aria-label="Fechar configurações">
            <span className="icon">close</span>
          </button>
        </div>
        <div className="sidebar-content">
          <KnowledgeBaseSection />

          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Configuração da Persona</h4>
            <fieldset disabled={connected || isChangingPersona}>
              <label className="persona-selector-label">
                Persona
                <select
                  value={activePersona?.id || ''}
                  onChange={handlePersonaChange}
                >
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {isChangingPersona && <span className="spinner persona-spinner"></span>}
                <p className="persona-description">{activePersona?.description}</p>
              </label>

              <label>
                Prompt do Sistema
                <textarea
                  rows={8}
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                />
              </label>

              <div className="voice-gender-selector">
                <label>Gênero da Voz</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="voice-gender"
                      value="male"
                      checked={voiceGender === 'male'}
                      onChange={() => setVoiceGender('male')}
                    />
                    <span>Masculino</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="voice-gender"
                      value="female"
                      checked={voiceGender === 'female'}
                      onChange={() => setVoiceGender('female')}
                    />
                    <span>Feminino</span>
                  </label>
                </div>
              </div>

              <label>
                Voz
                <select value={voice} onChange={e => setVoice(e.target.value)}>
                  {(voiceGender === 'male' ? MALE_VOICES : FEMALE_VOICES).map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              
               <div className="speech-rate-selector">
                  <label htmlFor="speech-rate-slider">
                    Velocidade da Fala: {speechRate.toFixed(2)}x
                  </label>
                  <input
                    type="range"
                    id="speech-rate-slider"
                    min="0.75"
                    max="1.25"
                    step="0.05"
                    value={speechRate}
                    onChange={e => setSpeechRate(parseFloat(e.target.value))}
                  />
                </div>
            </fieldset>
          </div>
          
           <div className="sidebar-section">
            <h4 className="sidebar-section-title">Ferramentas (Chamadas de Função)</h4>
            <fieldset disabled={connected}>
              <div className="tool-list">
                {hasGoogleSearch && (
                  <div className="tool-item">
                    <label className="tool-checkbox-wrapper">
                      <input type="checkbox" checked={true} disabled />
                      <span className="checkbox-visual"></span>
                    </label>
                    <span className="tool-name-text" title="Google Search">
                      Google Search
                    </span>
                    <div className="tool-actions" style={{ visibility: 'hidden' }}>
                      <button disabled><span className="icon">edit</span></button>
                      <button disabled><span className="icon">delete</span></button>
                    </div>
                  </div>
                )}
                {functionDeclarations.map(tool => (
                  <div key={tool.name} className="tool-item">
                    <label className="tool-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={tool.isEnabled}
                        onChange={() => toggleTool(tool.name)}
                      />
                      <span className="checkbox-visual"></span>
                    </label>
                     <span
                      className="tool-name-text"
                      title={tool.name}
                    >
                      {tool.name}
                    </span>
                    <div className="tool-actions">
                      <button onClick={() => setEditingTool(tool)} title="Editar ferramenta" aria-label="Editar ferramenta">
                        <span className="icon">edit</span>
                      </button>
                      <button onClick={() => removeTool(tool.name)} title="Remover ferramenta" aria-label="Remover ferramenta">
                        <span className="icon">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
               <button
                  className="add-tool-button"
                  onClick={handleAddNewTool}
                  disabled={connected || hasGoogleSearch}
                >
                  <span className="icon">add</span> Adicionar Ferramenta
                </button>
            </fieldset>
          </div>

          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Acessibilidade e Depuração</h4>
            <fieldset disabled={connected}>
              <label className="debug-toggle">
                <span>Ler respostas de texto em voz alta</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={readAloud}
                    onChange={() => setReadAloud(!readAloud)}
                  />
                  <span className="slider"></span>
                </div>
              </label>
              <label className="debug-toggle">
                <span>Logar chamadas de API no console</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={toggleDebugMode}
                  />
                  <span className="slider"></span>
                </div>
              </label>
            </fieldset>
          </div>

          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Integrações</h4>
            {isDriveApiReady ? (
              isSignedIn ? (
                <div className="google-user-profile">
                  <img src={profile?.imageUrl} alt="Foto do perfil" />
                  <div className="user-info">
                    <span className="user-name">{profile?.name}</span>
                    <span className="user-email">{profile?.email}</span>
                  </div>
                  <button onClick={handleSignoutClick} className="signout-button" title="Desconectar" aria-label="Desconectar do Google Drive">
                    <span className="icon">logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAuthClick}
                  className="google-signin-button"
                >
                  <span className="icon google-drive-icon"></span>
                  Conectar com Google Drive
                </button>
              )
            ) : (
              <p className="no-history">Carregando integração...</p>
            )}
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

export default memo(RightSidebar);