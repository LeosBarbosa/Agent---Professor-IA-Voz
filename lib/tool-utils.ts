/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FunctionCall } from './state';
import { FunctionResponseScheduling } from '@google/genai';

// A interface que representa a estrutura interna de uma ferramenta,
// incluindo propriedades personalizadas como 'isEnabled'.
interface InternalFunctionCall extends FunctionCall {
  isEnabled: boolean;
  scheduling?: FunctionResponseScheduling;
}

/**
 * Higieniza a configuração de ferramentas para garantir que ela seja compatível com a API Gemini.
 * Remove propriedades personalizadas (como `isEnabled`) e propriedades específicas de contexto
 * (como `scheduling` para a API de texto) que causariam um erro de "argumento inválido".
 *
 * @param rawTools A matriz de ferramentas bruta do estado da aplicação.
 * @param context O contexto da API ('live' para a API de voz ou 'text' para a API de texto).
 * @returns Uma matriz de ferramentas higienizada e compatível com a API, ou `undefined` se não houver ferramentas válidas.
 */
export function sanitizeToolsForApi(
  rawTools: any[] | undefined,
  context: 'live' | 'text'
): any[] | undefined {
  if (!rawTools || rawTools.length === 0) {
    return undefined;
  }

  const sanitizedToolSets = rawTools.map(toolSet => {
    // Passa a ferramenta googleSearch diretamente, pois não precisa de higienização.
    // NOTE: googleSearch is not currently supported in the Live API (multimodal-live).
    if (toolSet.googleSearch) {
      if (context === 'live') {
        return null;
      }
      return toolSet;
    }

    // Processa as declarações de função.
    if (toolSet.functionDeclarations) {
      const declarations: InternalFunctionCall[] = toolSet.functionDeclarations;

      const sanitizedDeclarations = declarations
        .filter(declaration => declaration.isEnabled) // 1. Filtra apenas as ferramentas ativadas.
        .map(declaration => {
          // 2. Cria um novo objeto contendo apenas as propriedades válidas para a API.
          const { name, description, parameters, scheduling } = declaration;

          const apiDeclaration: any = {
            name,
            description,
            parameters,
          };

          // 3. Adiciona condicionalmente propriedades específicas do contexto.
          // 'scheduling' é válido apenas para a API de voz (Live).
          if (context === 'live' && scheduling) {
            apiDeclaration.scheduling = scheduling;
          }

          return apiDeclaration;
        });
      
      // Se houver declarações válidas restantes, retorna o conjunto de ferramentas.
      if (sanitizedDeclarations.length > 0) {
        return { functionDeclarations: sanitizedDeclarations };
      }
    }
    // Retorna nulo se o conjunto de ferramentas estiver vazio ou for inválido.
    return null;
  }).filter(Boolean); // Remove quaisquer entradas nulas.

  // Retorna a matriz de ferramentas higienizada ou undefined se estiver vazia.
  return sanitizedToolSets.length > 0 ? sanitizedToolSets : undefined;
}