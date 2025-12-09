/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useLiveAPIProvider } from '../../contexts/LiveAPIContext';
import React from 'react';

export default function ErrorScreen() {
  const { error, clearError } = useLiveAPIProvider();

  if (!error) {
    return null; // Don't render anything if there's no error.
  }

  let displayMessage = 'Algo deu errado. Por favor, tente novamente.';
  let showTryAgain = true;

  if (error.includes('RESOURCE_EXHAUSTED')) {
    displayMessage =
      'Você atingiu o limite de uso gratuito da API Gemini Live por hoje. Agradecemos por explorar o sandbox! Sua cota será renovada amanhã.';
    showTryAgain = false;
  } else if (error.includes('Network error')) {
    displayMessage =
      'Ocorreu um erro de rede. Verifique sua conexão com a internet e confirme se a sua chave de API é válida e está configurada corretamente.';
  } else if (error.includes('microphone') || error.includes('microfone')) {
    // Exibe mensagens específicas para problemas de microfone capturadas pelo hook.
    displayMessage = error;
  }

  return (
    <div className="error-screen">
      <div
        style={{
          fontSize: 48,
        }}
      >
        💔
      </div>
      <div
        className="error-message-container"
        style={{
          fontSize: 22,
          lineHeight: 1.2,
          opacity: 0.8,
        }}
      >
        {displayMessage}
      </div>
      {showTryAgain ? (
        <button
          className="close-button"
          onClick={clearError}
        >
          Fechar
        </button>
      ) : null}
      <div
        className="error-raw-message-container"
        style={{
          fontSize: 15,
          lineHeight: 1.2,
          opacity: 0.4,
        }}
      >
        Erro da API Live: {error}
      </div>
    </div>
  );
}