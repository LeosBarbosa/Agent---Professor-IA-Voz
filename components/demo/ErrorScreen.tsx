/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useLiveAPIProvider } from '../../contexts/LiveAPIContext';
import React, { useEffect, useState } from 'react';

export interface ExtendedErrorType {
  code?: number;
  message?: string;
  status?: string;
}

export default function ErrorScreen() {
  const { client } = useLiveAPIProvider();
  const [error, setError] = useState<{ message?: string } | null>(null);

  useEffect(() => {
    function onError(error: ErrorEvent) {
      console.error(error);
      setError(error);
    }

    client.on('error', onError);

    return () => {
      client.off('error', onError);
    };
  }, [client]);

  let errorMessage = 'Algo deu errado. Por favor, tente novamente.';
  let rawMessage: string | null = error?.message || null;
  let tryAgainOption = true;

  if (error?.message?.includes('RESOURCE_EXHAUSTED')) {
    errorMessage =
      'Você atingiu o limite de uso gratuito da API Gemini Live por hoje. Agradecemos por explorar o sandbox! Sua cota será renovada amanhã.';
    rawMessage = null;
    tryAgainOption = false;
  } else if (error?.message?.includes('Network error')) {
    errorMessage =
      'Ocorreu um erro de rede. Verifique sua conexão com a internet e confirme se a sua chave de API é válida e está configurada corretamente.';
    rawMessage = `Detalhe do erro: ${rawMessage}`;
  }

  if (!error) {
    return <div style={{ display: 'none' }} />;
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
          opacity: 0.5,
        }}
      >
        {errorMessage}
      </div>
      {tryAgainOption ? (
        <button
          className="close-button"
          onClick={() => {
            setError(null);
          }}
        >
          Fechar
        </button>
      ) : null}
      {rawMessage ? (
        <div
          className="error-raw-message-container"
          style={{
            fontSize: 15,
            lineHeight: 1.2,
            opacity: 0.4,
          }}
        >
          {rawMessage}
        </div>
      ) : null}
    </div>
  );
}