/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FunctionResponseScheduling } from '@google/genai';
import { DEFAULT_LIVE_API_MODEL, MALE_VOICES, FEMALE_VOICES } from './constants';
import { personaConfig as defaultPersonas } from './personas';

// Type definitions

export interface Schema {
  type: string;
  properties?: { [key: string]: Schema };
  description?: string;
  required?: string[];
  items?: Schema;
}

export interface FunctionCall {
  name: string;
  description: string;
  parameters: Schema;
  isEnabled: boolean;
  scheduling: FunctionResponseScheduling;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ConversationTurn {
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  timestamp: Date;
  isRead?: boolean;
  groundingChunks?: GroundingChunk[];
  image?: string | null;
  sourceFile?: { name: string; id: string };
}

interface Conversation {
  id: string;
  title: string;
  turns: ConversationTurn[];
  lastModified: number;
  isPinned?: boolean;
}

export interface WelcomePrompt {
  title: string;
  description: string;
  prompt: string;
}

export interface Persona {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  systemPrompt: string;
  tools: FunctionCall[];
  header: { title: string; subtitle: string };
  welcome: { title: string; description: string; prompts: WelcomePrompt[], tips?: string[] };
  speechRate: number;
  isDefault?: boolean;
}

interface UploadModalState {
  isOpen: boolean;
  initialTextContent: string;
  initialImageContent: string | null;
  initialImageName: string;
}

// UI Store
interface UIState {
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  isHistoryOpen: boolean;
  toggleHistory: () => void;
  view: 'home' | 'chat';
  setView: (view: 'home' | 'chat') => void;
  isAgentThinking: boolean;
  setIsAgentThinking: (isThinking: boolean) => void;
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  confidence: number;
  setConfidence: (updater: (prevConfidence: number) => number) => void;
  isPersonaManagementOpen: boolean;
  togglePersonaManagement: () => void;
  isWelcomeModalOpen: boolean;
  setWelcomeModalOpen: (isOpen: boolean) => void;
  isPiPMode: boolean;
  togglePiPMode: () => void;
  setIsPiPMode: (isPiP: boolean) => void;
  uploadModalState: UploadModalState;
  openUploadModal: (initialContent: { text?: string; image?: string | null, imageName?: string }) => void;
  closeUploadModal: () => void;
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: { turnIndex: number; matchIndex: number }[];
  currentSearchResultIndex: number;
  toggleSearch: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: { turnIndex: number; matchIndex: number }[]) => void;
  setCurrentSearchResultIndex: (index: number) => void;
}

export const useUI = create<UIState>()((set) => ({
  isSettingsOpen: false,
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  isHistoryOpen: true,
  toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),
  view: 'home',
  setView: (view) => set({ view, isAgentThinking: false, confidence: 0 }),
  isAgentThinking: false,
  setIsAgentThinking: (isAgentThinking) => set({ isAgentThinking }),
  isPresentationMode: false,
  togglePresentationMode: () => set((state) => ({ isPresentationMode: !state.isPresentationMode })),
  isFocusMode: false,
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
  confidence: 0,
  setConfidence: (updater) => set((state) => ({ confidence: updater(state.confidence) })),
  isPersonaManagementOpen: false,
  togglePersonaManagement: () => set((state) => ({ isPersonaManagementOpen: !state.isPersonaManagementOpen })),
  isWelcomeModalOpen: !localStorage.getItem('gemini-live-sandbox-visited'),
  setWelcomeModalOpen: (isOpen) => {
    set({ isWelcomeModalOpen: isOpen });
    if (!isOpen) {
      localStorage.setItem('gemini-live-sandbox-visited', 'true');
    }
  },
  isPiPMode: false,
  togglePiPMode: () => set((state) => ({ isPiPMode: !state.isPiPMode })),
  setIsPiPMode: (isPiP) => set({ isPiPMode: isPiP }),
  uploadModalState: {
    isOpen: false,
    initialTextContent: '',
    initialImageContent: null,
    initialImageName: '',
  },
  openUploadModal: (initialContent) => set({
    uploadModalState: {
      isOpen: true,
      initialTextContent: initialContent.text || '',
      initialImageContent: initialContent.image || null,
      initialImageName: initialContent.imageName || '',
    }
  }),
  closeUploadModal: () => set({
    uploadModalState: {
      isOpen: false,
      initialTextContent: '',
      initialImageContent: null,
      initialImageName: '',
    }
  }),
  isSearchOpen: false,
  searchQuery: '',
  searchResults: [],
  currentSearchResultIndex: -1,
  toggleSearch: () =>
    set(state => ({
      isSearchOpen: !state.isSearchOpen,
      searchQuery: '',
      searchResults: [],
      currentSearchResultIndex: -1,
    })),
  setSearchQuery: searchQuery => set({ searchQuery }),
  setSearchResults: searchResults => set({ searchResults }),
  setCurrentSearchResultIndex: currentSearchResultIndex =>
    set({ currentSearchResultIndex }),
}));

// File Store
interface File {
  name: string;
  content: string;
}

interface FileStoreState {
  files: File[];
  addFile: (file: File) => void;
  removeFile: (fileName: string) => void;
  clearFiles: () => void;
}

export const useFileStore = create<FileStoreState>()((set) => ({
  files: [],
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  removeFile: (fileName) => set((state) => ({ files: state.files.filter((f) => f.name !== fileName) })),
  clearFiles: () => set({ files: [] }),
}));

// Settings Store
interface SettingsState {
  systemPrompt: string;
  model: string;
  voice: string;
  voiceGender: 'male' | 'female';
  speechRate: number;
  debugMode: boolean;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setVoiceGender: (gender: 'male' | 'female') => void;
  setSpeechRate: (rate: number) => void;
  toggleDebugMode: () => void;
}

export const useSettings = create<SettingsState>()((set, get) => ({
  systemPrompt: '', // Will be initialized by usePersonaStore
  model: DEFAULT_LIVE_API_MODEL,
  voice: MALE_VOICES[0],
  voiceGender: 'male',
  speechRate: 1.0,
  debugMode: false,
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setModel: (model) => set({ model }),
  setVoice: (voice) => set({ voice }),
  setVoiceGender: (voiceGender) => set({ voiceGender, voice: (voiceGender === 'male' ? MALE_VOICES : FEMALE_VOICES)[0] }),
  setSpeechRate: (speechRate) => set({ speechRate }),
  toggleDebugMode: () => set(state => ({ debugMode: !state.debugMode })),
}));

// Persona Store
interface PersonaState {
  personas: Persona[];
  activePersona: Persona | null;
  setActivePersonaById: (id: string | null) => void;
  addPersona: (newPersona: Omit<Persona, 'id' | 'isDefault'>) => Persona;
  updatePersona: (id: string, updatedPersona: Partial<Persona>) => void;
  deletePersona: (id: string) => void;
  resetToDefaults: () => void;
}
export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      personas: defaultPersonas,
      activePersona: null,
      setActivePersonaById: (id) => {
        const persona = get().personas.find(p => p.id === id);
        if (persona) {
          set({ activePersona: persona });
          useSettings.getState().setSystemPrompt(persona.systemPrompt);
          useSettings.getState().setSpeechRate(persona.speechRate);
          useTools.getState().setTools(persona.tools);
          useFileStore.getState().clearFiles();
        } else {
          set({ activePersona: null });
        }
      },
      addPersona: (newPersonaData) => {
        const newPersona: Persona = {
          ...newPersonaData,
          id: `persona_${Date.now()}`,
          isDefault: false,
        };
        set(state => ({ personas: [...state.personas, newPersona] }));
        return newPersona;
      },
      updatePersona: (id, updatedData) => {
        set(state => ({
          personas: state.personas.map(p => p.id === id ? { ...p, ...updatedData } : p)
        }));
      },
      deletePersona: (id) => {
        set(state => ({
          personas: state.personas.filter(p => p.id !== id && !p.isDefault)
        }));
        if (get().activePersona?.id === id) {
          get().setActivePersonaById(null);
          useUI.getState().setView('home');
        }
      },
      resetToDefaults: () => {
        set({ personas: defaultPersonas });
      }
    }),
    {
      name: 'gemini-persona-sandbox-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Tools Store (now simplified to hold tools for the active persona)
interface ToolsState {
  tools: FunctionCall[];
  setTools: (tools: FunctionCall[]) => void;
  toggleTool: (name: string) => void;
  addTool: () => FunctionCall;
  removeTool: (name: string) => void;
  updateTool: (name: string, updatedTool: FunctionCall) => void;
}

export const useTools = create<ToolsState>()((set, get) => ({
  tools: [],
  setTools: (tools) => set({ tools }),
  toggleTool: (name) =>
    set((state) => ({
      tools: state.tools.map((tool) =>
        tool.name === name ? { ...tool, isEnabled: !tool.isEnabled } : tool,
      ),
    })),
  addTool: () => {
    const newTool: FunctionCall = {
      name: `new_function_${Date.now()}`,
      description: 'A new function.',
      parameters: { type: 'OBJECT', properties: {} },
      isEnabled: true,
      scheduling: FunctionResponseScheduling.INTERRUPT,
    };
    set(state => ({ tools: [...state.tools, newTool] }));
    return newTool;
  },
  removeTool: (name) => set(state => ({ tools: state.tools.filter(t => t.name !== name) })),
  updateTool: (name, updatedTool) => set(state => ({
    tools: state.tools.map(t => t.name === name ? updatedTool : t)
  })),
}));

// History Store
interface HistoryState {
  conversations: Record<string, Conversation>;
  getSortedConversations: () => Conversation[];
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  saveConversation: (id: string, turns: ConversationTurn[]) => void;
  addConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      conversations: {},
      getSortedConversations: () => {
        return Object.values(get().conversations).sort((a: Conversation, b: Conversation) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.lastModified - a.lastModified;
        });
      },
      loadConversation: (id) => {
        return new Promise<void>((resolve) => {
          // Use a short timeout to allow the UI to update with a loading state
          // before potentially blocking synchronous operations like saving to localStorage.
          setTimeout(() => {
            const { turns, currentConversationId } = useLogStore.getState();
            if (id === currentConversationId) {
              resolve();
              return;
            }
            if (turns.length > 0) {
              get().saveConversation(currentConversationId, turns);
            }
            const conversationToLoad = get().conversations[id];
            if (conversationToLoad) {
              useLogStore.setState({ turns: [...conversationToLoad.turns], currentConversationId: id });
              useUI.getState().setView('chat');
            }
            resolve();
          }, 50);
        });
      },
      deleteConversation: (id) => {
        set(state => {
          const newConversations = { ...state.conversations };
          delete newConversations[id];
          return { conversations: newConversations };
        });
        if (useLogStore.getState().currentConversationId === id) {
          useLogStore.getState().startNewConversation();
        }
      },
      updateConversationTitle: (id, title) => {
        set(state => {
          const conversation = state.conversations[id];
          if (conversation) {
            return {
              conversations: {
                ...state.conversations,
                [id]: { ...conversation, title, lastModified: Date.now() },
              },
            };
          }
          return state;
        });
      },
      saveConversation: (id, turns) => {
        if (turns.length === 0) {
            if (useLogStore.getState().currentConversationId !== id) {
                set(state => {
                    const newConversations = { ...state.conversations };
                    delete newConversations[id];
                    return { conversations: newConversations };
                });
            }
            return;
        }

        const firstUserTurn = turns.find(t => t.role === 'user');
        const existingConversation = get().conversations[id];
        const title = existingConversation?.title && existingConversation.title !== 'Nova Conversa'
            ? existingConversation.title
            : firstUserTurn?.text.substring(0, 50).replace(/\n/g, ' ') || 'Nova Conversa';

        set(state => ({
          conversations: {
            ...state.conversations,
            [id]: {
              id,
              title,
              turns: [...turns],
              lastModified: Date.now(),
              isPinned: existingConversation?.isPinned || false,
             },
          },
        }));
      },
      addConversation: (id) => {
          if (get().conversations[id]) return;
          set(state => ({
              conversations: {
                  ...state.conversations,
                  [id]: { id, title: 'Nova Conversa', turns: [], lastModified: Date.now(), isPinned: false }
              }
          }))
      },
      togglePinConversation: (id: string) => {
        set(state => {
          const conversation = state.conversations[id];
          if (conversation) {
            return {
              conversations: {
                ...state.conversations,
                [id]: { ...conversation, isPinned: !conversation.isPinned, lastModified: Date.now() },
              },
            };
          }
          return state;
        });
      },
    }),
    {
      name: 'gemini-live-history-storage',
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value: any) => {
            if (key === 'conversations' && value) {
              Object.values(value).forEach((conv: any) => {
                if (conv.turns && Array.isArray(conv.turns)) {
                    conv.turns = conv.turns.map((turn: any) => ({ ...turn, timestamp: new Date(turn.timestamp) }));
                }
              });
            }
            return value;
        }
      }),
    },
  ),
);

// Log Store (current conversation)
interface LogState {
  turns: ConversationTurn[];
  currentConversationId: string;
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  markLastUserTurnAsRead: () => void;
  clearTurns: () => void;
  startNewConversation: () => Promise<void>;
  loadTurnsFromFile: (turns: ConversationTurn[]) => Promise<void>;
}

export const useLogStore = create<LogState>()((set, get) => ({
  turns: [],
  currentConversationId: `conv_${Date.now()}`,
  addTurn: (turn) => {
    set((state) => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    }));
    useHistoryStore.getState().saveConversation(get().currentConversationId, get().turns);
  },
  updateLastTurn: (update) => {
    set((state) => {
      const newTurns = [...state.turns];
      if (newTurns.length > 0) {
        newTurns[newTurns.length - 1] = { ...newTurns[newTurns.length - 1], ...update };
      }
      return { turns: newTurns };
    });
     if(update.isFinal){
        useHistoryStore.getState().saveConversation(get().currentConversationId, get().turns);
    }
  },
  markLastUserTurnAsRead: () => {
    set((state) => {
      const newTurns = [...state.turns];
      // Fix: Property 'findLastIndex' does not exist on type 'any[]'.
      // Manually find the last index of a user turn for broader compatibility.
      let lastUserTurnIndex = -1;
      for (let i = newTurns.length - 1; i >= 0; i--) {
        if (newTurns[i].role === 'user') {
          lastUserTurnIndex = i;
          break;
        }
      }
      if (lastUserTurnIndex !== -1) {
        newTurns[lastUserTurnIndex] = { ...newTurns[lastUserTurnIndex], isRead: true };
      }
      return { turns: newTurns };
    });
  },
  clearTurns: () => {
      useHistoryStore.getState().deleteConversation(get().currentConversationId);
      const newId = `conv_${Date.now()}`;
      set({ turns: [], currentConversationId: newId });
      useHistoryStore.getState().addConversation(newId);
  },
  startNewConversation: () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const { turns, currentConversationId } = get();
        if (turns.length > 0) {
          useHistoryStore.getState().saveConversation(currentConversationId, turns);
        }
        const newId = `conv_${Date.now()}`;
        set({ turns: [], currentConversationId: newId });
        useHistoryStore.getState().addConversation(newId);
        useUI.getState().setView('chat');
        resolve();
      }, 50);
    });
  },
  loadTurnsFromFile: async (turns) => {
    await get().startNewConversation();
    set({ turns });
    useHistoryStore.getState().saveConversation(get().currentConversationId, get().turns);
    useUI.getState().setView('chat');
  },
}));

// Initialize first conversation
useHistoryStore.getState().addConversation(useLogStore.getState().currentConversationId);