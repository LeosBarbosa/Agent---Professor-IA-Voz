/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionCall } from '../state';
import { FunctionResponseScheduling } from '@google/genai';

export const personalAssistantTools: FunctionCall[] = [
  {
    name: 'create_calendar_event',
    description: 'Cria um novo evento no calendário do usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: {
          type: 'STRING',
          description: 'O título ou resumo do evento.',
        },
        location: {
          type: 'STRING',
          description: 'O local do evento.',
        },
        startTime: {
          type: 'STRING',
          description: 'A hora de início do evento no formato ISO 8601.',
        },
        endTime: {
          type: 'STRING',
          description: 'A hora de término do evento no formato ISO 8601.',
        },
      },
      required: ['summary', 'startTime', 'endTime'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'send_email',
    description: 'Envia um e-mail para um destinatário especificado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient: {
          type: 'STRING',
          description: 'O endereço de e-mail do destinatário.',
        },
        subject: {
          type: 'STRING',
          description: 'A linha de assunto do e-mail.',
        },
        body: {
          type: 'STRING',
          description: 'O conteúdo do corpo do e-mail.',
        },
      },
      required: ['recipient', 'subject', 'body'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'set_reminder',
    description: 'Define um lembrete para o usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {
        task: {
          type: 'STRING',
          description: 'A tarefa para o lembrete.',
        },
        time: {
          type: 'STRING',
          description: 'A hora do lembrete no formato ISO 8601.',
        },
      },
      required: ['task', 'time'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];
