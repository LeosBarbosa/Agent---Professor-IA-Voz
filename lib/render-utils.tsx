/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const renderContent = (text: string) => {
  // Adiciona uma verificação de segurança. Se por algum motivo o texto não for uma string,
  // evita uma falha ao retornar nulo.
  if (typeof text !== 'string') {
    return null;
  }
  
  // Divide por blocos de código ```json...```
  const parts = text.split(/(`{3}json\n[\s\S]*?\n`{3})/g);

  return parts.map((part, index) => {
    if (part.startsWith('```json')) {
      const jsonContent = part.replace(/^`{3}json\n|`{3}$/g, '');
      return (
        <pre key={index}>
          <code>{jsonContent}</code>
        </pre>
      );
    }

    // Divide por texto em **negrito**
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    
    // CORREÇÃO: Envolve a saída do mapa interno em um único Fragmento com chave.
    // Isso garante que o mapa externo sempre retorne uma lista "plana" de elementos React válidos
    // (um <pre> ou um <Fragment>), em vez de uma mistura de elementos e arrays,
    // o que causava o erro de renderização do React.
    return (
      <React.Fragment key={index}>
        {boldParts.map((boldPart, boldIndex) => {
          if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
            return <strong key={boldIndex}>{boldPart.slice(2, -2)}</strong>;
          }
          return boldPart;
        })}
      </React.Fragment>
    );
  });
};