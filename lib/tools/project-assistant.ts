/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionResponseScheduling } from '@google/genai';
import { FunctionCall } from '../state';

export const projectAssistantTools: FunctionCall[] = [
  {
    name: 'search_knowledge_base',
    description: 'Pesquisa na base de conhecimento do usuário (arquivos no Google Drive) por informações relevantes para responder a uma pergunta. Use isso quando o usuário perguntar sobre projetos, resumos, dados ou qualquer coisa que possa estar em um documento.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Uma consulta de pesquisa concisa e rica em palavras-chave para encontrar o documento mais relevante. Por exemplo: "resumo reunião Órion" ou "orçamento aprovado projeto Vega".',
        },
      },
      required: ['query'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];
