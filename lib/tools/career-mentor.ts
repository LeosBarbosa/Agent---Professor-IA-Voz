/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionResponseScheduling } from '@google/genai';
import { FunctionCall } from '../state';

export const englishTeacherTools: FunctionCall[] = [
  {
    name: 'define_word',
    description: 'Fornece a definição de uma palavra em inglês, juntamente com a transcrição fonética (IPA) e um link de áudio para pronúncia, se disponível. Toca o áudio da pronúncia como um efeito colateral e retorna todos os IPAs disponíveis para o modelo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        word: {
          type: 'STRING',
          description: 'A palavra a ser definida.',
        },
      },
      required: ['word'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'check_grammar',
    description: 'Verifica a gramática de uma frase em inglês e fornece correções e explicações.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sentence: {
          type: 'STRING',
          description: 'A frase a ser verificada.',
        },
      },
      required: ['sentence'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'suggest_synonyms',
    description: 'Sugere sinônimos para uma palavra em inglês para ajudar a expandir o vocabulário.',
    parameters: {
      type: 'OBJECT',
      properties: {
        word: {
          type: 'STRING',
          description: 'A palavra para a qual encontrar sinônimos.',
        },
      },
      required: ['word'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'translate_text',
    description: 'Traduz um texto do português para o inglês ou vice-versa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        text: {
          type: 'STRING',
          description: 'O texto a ser traduzido.',
        },
        target_language: {
          type: 'STRING',
          description: 'O idioma para o qual traduzir (por exemplo, "English" ou "Portuguese").',
        },
      },
      required: ['text', 'target_language'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];


export const industrialProfessorTools: FunctionCall[] = [];
