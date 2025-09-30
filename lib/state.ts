/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { englishTeacherTools, industrialProfessorTools } from './tools/career-mentor';

export type Template = 'english-teacher' | 'industrial-professor';

export interface WelcomePrompt {
  title: string;
  description: string;
  prompt: string;
}

export const personaConfig: Record<Template, {
  systemPrompt: string;
  header: { title: string; subtitle: string };
  welcome: { title: string; description: string; prompts: WelcomePrompt[] };
  popup: { title: string; p1: string; p2: string };
}> = {
  'english-teacher': {
    systemPrompt: "Você é um professor de inglês amigável e experiente chamado Alex, com uma abordagem prática e altamente personalizada. Seu objetivo principal é ajudar o usuário a ganhar fluência e confiança em inglês, focando em conversação e escrita.\n\n**Sua metodologia de ensino é baseada em 3 pilares:**\n\n1.  **Feedback Construtivo e Detalhado:** Ao identificar um erro, não apenas corrija. **Sempre** ofereça uma explicação clara e concisa sobre o porquê de ser um erro (regra gramatical, uso inadequado de vocabulário, etc.). Em seguida, **imediatamente** forneça um ou dois exemplos corretos e um mini-exercício de fixação (ex: \"Tente criar uma frase usando esta palavra corretamente\" ou \"Complete a seguinte frase...\"). Este ciclo de correção-explicação-prática é fundamental.\n\n2.  **Adaptação Dinâmica:** Monitore constantemente o nível de inglês do aluno. Se ele estiver com dificuldades, simplifique a linguagem e os conceitos. Se estiver progredindo bem, introduza vocabulário mais avançado, expressões idiomáticas comuns (ex: 'bite the bullet', 'hit the nail on the head') e estruturas gramaticais mais complexas para desafiá-lo. Sua meta é manter o aluno na zona de desenvolvimento proximal, onde o aprendizado é mais eficaz.\n\n3.  **Contextualização e Encorajamento:** Inicie a conversa de forma casual e amigável. Use perguntas abertas para estimular o diálogo. Mantenha um tom paciente e encorajador, celebrando cada progresso. Responda primariamente em inglês, mas não hesite em usar o português para explicações gramaticais mais complexas, garantindo a total compreensão do aluno. O objetivo é a comunicação eficaz e a construção da confiança.",
    header: {
      title: 'English Teacher Sandbox',
      subtitle: 'Converse com Alex, seu professor de inglês particular.',
    },
    welcome: {
      title: 'Tutor de Língua Inglesa',
      description: "Olá! Sou Alex, seu tutor de inglês particular. Pronto para praticar suas habilidades de conversação? Vamos conversar!",
      prompts: [
        {
          title: 'Correção Gramatical',
          description: 'Peça ao Alex para corrigir suas frases e explicar as regras por trás das correções para um aprendizado eficaz.',
          prompt: 'Please correct this sentence: "I have went to the store yesterday."',
        },
        {
          title: 'Expansão de Vocabulário',
          description: 'Descubra novas palavras, sinônimos e expressões idiomáticas para enriquecer sua comunicação.',
          prompt: 'What are some other ways to say "very happy"?',
        },
        {
          title: 'Conversação Livre',
          description: 'Inicie um bate-papo casual sobre um tópico de seu interesse, como viagens, hobbies ou trabalho, e pratique sua fluência.',
          prompt: 'Can we talk about my last vacation to Brazil?',
        },
      ],
    },
    popup: {
      title: 'Bem-vindo ao English Teacher Sandbox',
      p1: 'Seu espaço para praticar inglês com um tutor de IA.',
      p2: 'Para começar:',
    },
  },
  'industrial-professor': {
    systemPrompt: `Você é o Professor Barros, um acadêmico e especialista em Engenharia de Produção, com foco em Gestão de Processos e da Produção. Sua missão é atuar como um professor e mentor, guiando os usuários na análise e otimização de operações industriais e de distribuição, combinando rigor teórico com aplicabilidade prática.

**Seus principais conhecimentos e atividades são:**
- **Otimização de Processos:** Identificar gargalos, ineficiências e oportunidades de melhoria nos fluxos de trabalho.
- **Planejamento e Controle da Produção:** Gerenciar recursos (materiais, mão de obra, maquinário), definir padrões de qualidade e monitorar o desempenho da produção.
- **Logística:** Gerenciar cadeias de suprimentos e a distribuição de produtos.
- **Análise de Dados:** Utilizar dados e indicadores para avaliar a performance dos processos e tomar decisões estratégicas.

Comunique-se de forma didática e profissional, como um professor. Use analogias, casos de estudo e dados para ilustrar seus pontos. Responda principalmente em português.

**Sua abordagem pedagógica para análise de cenários é:**
1.  **Diagnóstico:** Proponha uma abordagem passo a passo para diagnosticar problemas, incluindo:
    - Mapeamento do fluxo de valor (VSM) para identificar gargalos.
    - Avaliação de indicadores-chave: lead time, taxa de serviço (OTIF), níveis de estoque, custo por unidade.
    - Investigação de causas raiz com ferramentas como 5 Porquês e Diagrama de Ishikawa.
2.  **Solução:** Guie na formulação de sugestões de melhorias com impacto mensurável, priorizadas por custo e benefício.
3.  **Implementação:** Discuta exemplos práticos, cronogramas realistas e critérios de acompanhamento.

Sempre conecte as decisões operacionais aos resultados financeiros (margem, giro de estoque, ROI) e discuta riscos e planos de contingência.`,
    header: {
      title: 'Sandbox de Processos Industriais',
      subtitle: 'Converse com o Professor Barros, seu especialista em indústria e distribuição.',
    },
    welcome: {
      title: 'Consultor de Indústria e Distribuição',
      description: 'Sou o Professor Barros, seu especialista em processos industriais e no setor de atacado distribuidor. Como posso ajudá-lo hoje?',
      prompts: [
        {
          title: 'Manufatura Enxuta',
          description: 'Explore os conceitos fundamentais do Lean Manufacturing para eliminar desperdícios e aumentar a eficiência.',
          prompt: 'Quais são os princípios do Lean Manufacturing?',
        },
        {
          title: 'Gestão de Estoque',
          description: 'Aprenda a classificar itens de estoque para otimizar o controle, reduzir custos e melhorar o fluxo de caixa.',
          prompt: 'Como a análise ABC pode otimizar a gestão de estoque?',
        },
        {
          title: 'Sistemas de Produção',
          description: 'Entenda como o sistema JIT funciona para minimizar o inventário e aumentar a eficiência na produção.',
          prompt: 'Explique o conceito de Just-in-Time (JIT) na produção.',
        },
        {
          title: 'Logística Otimizada',
          description: 'Descubra como o cross-docking pode agilizar sua cadeia de suprimentos, reduzindo custos de armazenagem.',
          prompt: 'O que é "cross-docking"?',
        },
      ],
    },
    popup: {
      title: 'Bem-vindo ao Sandbox de Processos Industriais',
      p1: 'Seu ponto de partida para otimizar operações com IA.',
      p2: 'Para começar:',
    },
  },
};

const toolsets: Record<Template, FunctionCall[]> = {
  'english-teacher': englishTeacherTools,
  'industrial-professor': industrialProfessorTools,
};

import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
}>(set => ({
  systemPrompt: personaConfig['english-teacher'].systemPrompt,
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
}));

/**
 * UI
 */
export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: true,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description?: string;
  parameters?: any;
  isEnabled: boolean;
  scheduling?: FunctionResponseScheduling;
}



export const useTools = create<{
  tools: FunctionCall[];
  template: Template;
  setTemplate: (template: Template) => void;
  toggleTool: (toolName: string) => void;
  addTool: () => void;
  removeTool: (toolName: string) => void;
  updateTool: (oldName: string, updatedTool: FunctionCall) => void;
}>(set => ({
  tools: toolsets['english-teacher'],
  template: 'english-teacher',
  setTemplate: (template: Template) => {
    set({ tools: toolsets[template], template });
    useSettings.getState().setSystemPrompt(personaConfig[template].systemPrompt);
  },
  toggleTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === toolName ? { ...tool, isEnabled: !tool.isEnabled } : tool,
      ),
    })),
  addTool: () =>
    set(state => {
      let newToolName = 'new_function';
      let counter = 1;
      while (state.tools.some(tool => tool.name === newToolName)) {
        newToolName = `new_function_${counter++}`;
      }
      return {
        tools: [
          ...state.tools,
          {
            name: newToolName,
            isEnabled: true,
            description: '',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
            scheduling: FunctionResponseScheduling.INTERRUPT,
          },
        ],
      };
    }),
  removeTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.filter(tool => tool.name !== toolName),
    })),
  updateTool: (oldName: string, updatedTool: FunctionCall) =>
    set(state => {
      // Check for name collisions if the name was changed
      if (
        oldName !== updatedTool.name &&
        state.tools.some(tool => tool.name === updatedTool.name)
      ) {
        console.warn(`Tool with name "${updatedTool.name}" already exists.`);
        // Prevent the update by returning the current state
        return state;
      }
      return {
        tools: state.tools.map(tool =>
          tool.name === oldName ? updatedTool : tool,
        ),
      };
    }),
}));

/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export interface GroundingChunk {
  web?: {
    // FIX: Type 'GroundingChunk[]' is not assignable. Match type from @google/genai where uri and title are optional.
    uri?: string;
    title?: string;
  };
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  isRead?: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  currentConversationId: string;
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  markLastUserTurnAsRead: () => void;
  clearTurns: () => void;
  startNewConversation: () => void;
  _loadConversation: (id: string, turns: ConversationTurn[]) => void;
}>((set, get) => ({
  turns: [],
  currentConversationId: crypto.randomUUID(),
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  markLastUserTurnAsRead: () => {
    set(state => {
      const newTurns = [...state.turns];
      // Find the last user turn and mark it as read
      for (let i = newTurns.length - 1; i >= 0; i--) {
        if (newTurns[i].role === 'user' && !newTurns[i].isRead) {
          newTurns[i] = { ...newTurns[i], isRead: true };
          break;
        }
      }
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [], currentConversationId: crypto.randomUUID() }),
  startNewConversation: () => {
    set({ turns: [], currentConversationId: crypto.randomUUID() });
  },
  _loadConversation: (id: string, turns: ConversationTurn[]) => {
    set({ turns, currentConversationId: id });
  },
}));

/**
 * History
 */
interface HistoryItem {
  id: string;
  title: string;
  createdAt: string;
  turns: ConversationTurn[];
}

export const useHistoryStore = create<{
  conversations: Record<string, HistoryItem>;
  saveCurrentConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  getSortedConversations: () => Omit<HistoryItem, 'turns'>[];
}>()(
  persist(
    (set, get) => ({
      conversations: {},
      saveCurrentConversation: () => {
        const { currentConversationId, turns } = useLogStore.getState();
        // Don't save empty conversations
        if (turns.length === 0) return;

        const conversations = get().conversations;
        const existing = conversations[currentConversationId];

        const firstUserTurn = turns.find(t => t.role === 'user');
        const title =
          existing?.title ||
          (firstUserTurn?.text
            ? firstUserTurn.text.substring(0, 40) +
              (firstUserTurn.text.length > 40 ? '...' : '')
            : 'Nova Conversa');

        const newConversation = {
          id: currentConversationId,
          title,
          createdAt: existing?.createdAt || new Date().toISOString(),
          turns,
        };

        set({
          conversations: {
            ...conversations,
            [currentConversationId]: newConversation,
          },
        });
      },
      loadConversation: id => {
        const conversation = get().conversations[id];
        if (conversation) {
          useLogStore.getState()._loadConversation(id, conversation.turns);
        }
      },
      deleteConversation: id => {
        set(state => {
          const newConversations = { ...state.conversations };
          delete newConversations[id];
          return { conversations: newConversations };
        });

        if (useLogStore.getState().currentConversationId === id) {
          useLogStore.getState().startNewConversation();
        }
      },
      getSortedConversations: () => {
        return Object.values(get().conversations)
          .map(({ id, title, createdAt }) => ({ id, title, createdAt }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
      },
    }),
    {
      name: 'conversation-history-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Auto-save the current conversation when turns are added/updated.
useLogStore.subscribe((state, prevState) => {
  // Simple check: if turns array is different and not empty, save.
  if (state.turns !== prevState.turns && state.turns.length > 0) {
    useHistoryStore.getState().saveCurrentConversation();
  }
});