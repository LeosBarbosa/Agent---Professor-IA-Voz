/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { createContext, FC, ReactNode, useContext, useMemo } from 'react';
import { useLiveApi, UseLiveApiResults } from '../hooks/media/use-live-api';

const LiveAPIContext = createContext<Omit<UseLiveApiResults, 'volume'> | undefined>(undefined);
const LiveAPIVolumeContext = createContext<{ volume: number } | undefined>(undefined);

export type LiveAPIProviderProps = {
  children: ReactNode;
  apiKey: string;
};

export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  apiKey,
  children,
}) => {
  const { volume, ...rawApi } = useLiveApi({ apiKey });

  // CORREÇÃO CRÍTICA: Memorizar o objeto da API para impedir loops de renderização.
  // O 'rawApi' é recriado a cada frame pelo hook useLiveApi devido à mudança de volume.
  // Aqui nós extraímos apenas as referências estáveis.
  const stableApi = useMemo(() => {
    const impl = {
      client: rawApi.client,
      connect: rawApi.connect,
      disconnect: rawApi.disconnect,
      connected: rawApi.connected,
      muted: rawApi.muted,
      toggleMute: rawApi.toggleMute,
      videoStream: rawApi.videoStream,
      toggleVideo: rawApi.toggleVideo,
      recordingStatus: rawApi.recordingStatus,
      toggleRecording: rawApi.toggleRecording,
      recordingTime: rawApi.recordingTime,
      speakingTime: rawApi.speakingTime,
      inputAnalyser: rawApi.inputAnalyser,
      outputAnalyser: rawApi.outputAnalyser,
      agentAudioStream: rawApi.agentAudioStream,
      error: rawApi.error,
      clearError: rawApi.clearError,
    };
    return { ...impl, stable: impl };
  }, [
    // Dependências explícitas para garantir estabilidade
    rawApi.client, rawApi.connect, rawApi.disconnect, rawApi.connected, 
    rawApi.muted, rawApi.toggleMute, rawApi.videoStream, rawApi.toggleVideo,
    rawApi.recordingStatus, rawApi.toggleRecording, rawApi.recordingTime, 
    rawApi.speakingTime, rawApi.inputAnalyser, rawApi.outputAnalyser, 
    rawApi.agentAudioStream, rawApi.error, rawApi.clearError
  ]);

  return (
    <LiveAPIContext.Provider value={stableApi}>
      <LiveAPIVolumeContext.Provider value={{ volume }}>
        {children}
      </LiveAPIVolumeContext.Provider>
    </LiveAPIContext.Provider>
  );
};

export const useLiveAPIProvider = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error('useLiveAPIProvider must be used within a LiveAPIProvider');
  }
  return context;
};

export const useLiveAPIVolume = () => {
  const context = useContext(LiveAPIVolumeContext);
  if (!context) {
    throw new Error('useLiveAPIVolume must be used within a LiveAPIProvider');
  }
  return context;
};
