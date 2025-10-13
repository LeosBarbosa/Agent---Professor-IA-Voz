/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { Persona, WelcomePrompt, usePersonaStore, useLogStore } from '../../../lib/state';
import { useLiveAPIProvider } from '../../../contexts/LiveAPIContext';
import './PersonaCreationWizard.css';

interface PersonaCreationWizardProps {
  onClose: () => void;
}

const initialPrompt: WelcomePrompt = { title: '', description: '', prompt: '' };

const PersonaCreationWizard: React.FC<PersonaCreationWizardProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const { addPersona, setActivePersonaById } = usePersonaStore();
  const { startNewConversation } = useLogStore();
  const { connected, disconnect } = useLiveAPIProvider();
  const [personaData, setPersonaData] = useState({
    name: '',
    icon: '',
    tagline: '',
    systemPrompt: '',
    speechRate: 1.0,
    welcome: {
      title: '',
      description: '',
      prompts: [{ ...initialPrompt }],
    },
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const [section, field] = name.split('.');

    if (e.target.type === 'range') {
        setPersonaData(prev => ({ ...prev, [name]: parseFloat(value) }));
        return;
    }

    if (section === 'welcome' && field) {
      setPersonaData(prev => ({
        ...prev,
        welcome: { ...prev.welcome, [field]: value },
      }));
    } else {
      setPersonaData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePromptChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const prompts = [...personaData.welcome.prompts];
    prompts[index] = { ...prompts[index], [name as keyof WelcomePrompt]: value };
    setPersonaData(prev => ({
      ...prev,
      welcome: { ...prev.welcome, prompts },
    }));
  };

  const addPrompt = () => {
    const prompts = [...personaData.welcome.prompts, { ...initialPrompt }];
    setPersonaData(prev => ({
      ...prev,
      welcome: { ...prev.welcome, prompts },
    }));
  };

  const removePrompt = (index: number) => {
    const prompts = [...personaData.welcome.prompts];
    if (prompts.length > 1) {
      prompts.splice(index, 1);
      setPersonaData(prev => ({
        ...prev,
        welcome: { ...prev.welcome, prompts },
      }));
    }
  };

  const handleSubmit = async () => {
    const newPersonaData: Omit<Persona, 'id' | 'isDefault'> = {
      name: personaData.name || 'Nova Persona',
      icon: personaData.icon || 'smart_toy',
      tagline: personaData.tagline || 'Uma breve descrição.',
      description: personaData.tagline || 'Uma breve descrição.',
      systemPrompt: personaData.systemPrompt || 'Você é um assistente prestativo.',
      tools: [],
      speechRate: personaData.speechRate,
      header: {
        title: personaData.name || 'Nova Persona',
        subtitle: `Converse com ${personaData.name || 'sua nova IA'}`
      },
      welcome: {
        title: personaData.welcome.title || `Bem-vindo(a) a ${personaData.name}`,
        description: personaData.welcome.description || 'Comece a conversa.',
        prompts: personaData.welcome.prompts.filter(p => p.title && p.prompt),
      },
    };
    const createdPersona = addPersona(newPersonaData);
    if (connected) {
      disconnect();
    }
    setActivePersonaById(createdPersona.id);
    await startNewConversation();
    onClose();
  };

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="persona-wizard-overlay">
      <div className="persona-wizard-container">
        <header className="persona-wizard-header">
          <h2>Criar Nova Persona</h2>
          <button className="close-button" onClick={onClose} aria-label="Fechar assistente de criação">
            <span className="icon">close</span>
          </button>
        </header>
        <div className="persona-wizard-progress-bar">
          <div className="progress-bar-inner" style={{ width: `${progress}%` }}></div>
        </div>

        <main className="persona-wizard-body">
          {step === 1 && (
            <div className="wizard-step">
              <h3>Passo 1: Identidade Principal</h3>
              <p>Dê um nome, ícone e um slogan para sua IA.</p>
              <label>Nome da Persona</label>
              <input name="name" value={personaData.name} onChange={handleChange} placeholder="Ex: Professor de Inglês" />
              <label>Ícone (Material Symbols)</label>
              <input name="icon" value={personaData.icon} onChange={handleChange} placeholder="Ex: school" />
              <label>Slogan (breve descrição para o cartão)</label>
              <input name="tagline" value={personaData.tagline} onChange={handleChange} placeholder="Ex: Seu tutor particular de inglês" />
              <label>Velocidade da Fala: {personaData.speechRate.toFixed(2)}x</label>
              <input
                type="range"
                name="speechRate"
                min="0.75"
                max="1.25"
                step="0.05"
                value={personaData.speechRate}
                onChange={handleChange}
              />
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <h3>Passo 2: O Cérebro da IA</h3>
              <p>Escreva o "Prompt do Sistema". Esta é a instrução principal que define a personalidade, o conhecimento e as regras da sua IA.</p>
              <label>Prompt do Sistema</label>
              <textarea name="systemPrompt" value={personaData.systemPrompt} onChange={handleChange} rows={12} placeholder="Ex: Você é um professor de inglês amigável e paciente..."/>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <h3>Passo 3: A Primeira Impressão</h3>
              <p>Como a sua IA deve se apresentar quando um novo chat começa?</p>
              <label>Título da Tela de Boas-vindas</label>
              <input name="welcome.title" value={personaData.welcome.title} onChange={handleChange} placeholder="Ex: Bem-vindo ao Tutor de Inglês"/>
              <label>Descrição de Boas-vindas</label>
              <textarea name="welcome.description" value={personaData.welcome.description} onChange={handleChange} rows={4} placeholder="Ex: Olá! Sou Alex, seu tutor particular. Pronto para praticar?"/>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step">
              <h3>Passo 4: Sugestões de Conversa</h3>
              <p>Crie alguns exemplos de prompts para ajudar o usuário a começar.</p>
              <div className="prompt-editor-list">
                {personaData.welcome.prompts.map((p, index) => (
                  <div key={index} className="prompt-editor-item">
                    <div className="prompt-inputs">
                      <input name="title" value={p.title} onChange={(e) => handlePromptChange(index, e)} placeholder="Título do Card (Ex: Correção Gramatical)" />
                      <input name="description" value={p.description} onChange={(e) => handlePromptChange(index, e)} placeholder="Descrição do Card" />
                      <input name="prompt" value={p.prompt} onChange={(e) => handlePromptChange(index, e)} placeholder="Prompt a ser enviado (Ex: Corrija esta frase...)" />
                    </div>
                    <button onClick={() => removePrompt(index)} disabled={personaData.welcome.prompts.length === 1} title="Remover prompt">
                      <span className="icon">delete</span>
                    </button>
                  </div>
                ))}
              </div>
              <button className="add-prompt-button" onClick={addPrompt}>
                <span className="icon">add</span> Adicionar Outro Prompt
              </button>
            </div>
          )}
        </main>

        <footer className="persona-wizard-footer">
          {step > 1 && <button className="back-button" onClick={handleBack}>Voltar</button>}
          <div style={{flexGrow: 1}}></div>
          {step < totalSteps && <button className="next-button" onClick={handleNext}>Próximo</button>}
          {step === totalSteps && <button className="save-button" onClick={handleSubmit}>Salvar Persona</button>}
        </footer>
      </div>
    </div>
  );
};

export default PersonaCreationWizard;