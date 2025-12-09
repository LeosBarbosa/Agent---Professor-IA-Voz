/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GenAILiveClient } from '../../lib/genai-live-client';
import { LiveConnectConfig, LiveServerToolCall, Modality, Part, Content } from '@google/genai';
import { AudioStreamer } from '../../lib/audio-streamer';
import { audioContext } from '../../lib/utils';
import VolMeterWorket from '../../lib/worklets/vol-meter';
import { useLogStore, useSettings, useHistoryStore, useTools } from '../../lib/state';
import { AudioRecorder } from '../../lib/audio-recorder';
import { useGoogleDriveContext } from '../../contexts/GoogleDriveContext';
import { sanitizeToolsForApi } from '../../lib/tool-utils';

export type RecordingStatus = 'idle' | 'recording' | 'processing';
const FOLDER_NAME = 'Base de Conhecimento - Projetos';

export type UseLiveApiResults = {
  client: GenAILiveClient;
  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  volume: number;
  toggleMute: () => void;
  muted: boolean;
  toggleVideo: () => void;
  videoStream: MediaStream | null;
  toggleRecording: () => void;
  recordingStatus: RecordingStatus;
  recordingTime: number;
  speakingTime: number;
  inputAnalyser?: AnalyserNode;
  outputAnalyser?: AnalyserNode;
  agentAudioStream?: MediaStream;
  error: string | null;
  clearError: () => void;
};

export function useLiveApi({
  apiKey,
}: {
  apiKey: string;
}): UseLiveApiResults {
  const { model } = useSettings();
  const client = useMemo(() => new GenAILiveClient(apiKey, model), [apiKey, model]);
  const { findFolderByName, searchFiles, downloadFileContent } = useGoogleDriveContext();

  const [muted, setMuted] = useState(true);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [speakingTime, setSpeakingTime] = useState(0);
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | undefined>();
  const [outputAnalyser, setOutputAnalyser] = useState<
    AnalyserNode | undefined
  >();
  const [agentAudioStream, setAgentAudioStream] = useState<
    MediaStream | undefined
  >();
  const [error, setError] = useState<string | null>(null);

  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const micSourceInOutputCtxRef = useRef<MediaStreamAudioSourceNode | null>(
    null,
  );
  const mixerDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(
    null,
  );
  const pronunciationAudioRef = useRef<{
    audio: HTMLAudioElement;
    blobUrl: string;
    timeoutId: number;
  } | null>(null);

  // Video Streaming Refs
  const videoIntervalRef = useRef<number | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: 'audio-out' }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        setOutputAnalyser(audioStreamerRef.current.analyserNode);
        setAgentAudioStream(audioStreamerRef.current.outputStream);
        audioStreamerRef.current
          .addWorklet<any>('vu-meter', VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .catch(err => {
            console.error('Error adding worklet:', err);
          });
      });
    }
  }, []);

  useEffect(() => {
    const recorder = audioRecorderRef.current;
    const onData = (base64: string) => {
      client.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64 }]);
    };
    if (connected && !muted) {
      recorder.on('data', onData);
    } else {
      recorder.off('data', onData);
    }
    return () => {
      recorder.off('data', onData);
    };
  }, [connected, muted, client]);
  
  // Video streaming logic
  useEffect(() => {
    if (videoStream && connected) {
      const video = videoElementRef.current || document.createElement('video');
      videoElementRef.current = video;
      video.srcObject = videoStream;
      video.muted = true;
      video.play().catch(e => console.error("Error playing hidden video for frame capture:", e));

      const canvas = canvasElementRef.current || document.createElement('canvas');
      canvasElementRef.current = canvas;
      const ctx = canvas.getContext('2d');

      const sendFrame = () => {
        if (!ctx || !video.videoWidth || !video.videoHeight) return;
        
        canvas.width = video.videoWidth * 0.5; // Scale down for performance/bandwidth
        canvas.height = video.videoHeight * 0.5;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        client.sendRealtimeInput([{ mimeType: 'image/jpeg', data: base64Data }]);
      };

      // Send a frame every 500ms (2 FPS)
      videoIntervalRef.current = window.setInterval(sendFrame, 500);
    } else {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
    }

    return () => {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
    };
  }, [videoStream, connected, client]);

  useEffect(() => {
    let timerId: number | null = null;
    if (connected && !muted) {
      timerId = window.setInterval(() => {
        setSpeakingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setSpeakingTime(0);
    }
  
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [connected, muted]);

  useEffect(() => {
    const onOpen = () => setConnected(true);
    const onClose = () => {
      setConnected(false);
      setVideoStream(null); // Desliga o vídeo ao desconectar
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      audioRecorderRef.current.stop();
    };
    const onError = (e: ErrorEvent) => {
        let message = 'Ocorreu um erro desconhecido na API Live.';
        if (e.message) {
            message = e.message;
        }
        setError(message);
    };
    const onAudio = (data: ArrayBuffer) => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.addPCM16(new Uint8Array(data));
      }
    };
    const stopAudioStreamer = () => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop();
      }
    };
    const onToolCall = async (toolCall: LiveServerToolCall) => {
      const functionResponses: any[] = [];
      const { addTurn, updateLastTurn } = useLogStore.getState();

      for (const fc of toolCall.functionCalls) {
        let result: any;
        let sourceFile: { name: string; id: string } | undefined = undefined;

        addTurn({
          role: 'system',
          text: `Ativando ferramenta: **${
            fc.name
          }**\n\`\`\`json\n${JSON.stringify(fc.args, null, 2)}\n\`\`\``,
          isFinal: true,
        });

        if (fc.name === 'define_word' && fc.args.word) {
          try {
            const word = fc.args.word as string;
            const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
            if (useSettings.getState().debugMode) {
              console.log(`[DEBUG] fetch: GET ${apiUrl}`);
            }
            const response = await fetch(
              `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
            );

            if (response.ok) {
              const data = await response.json();
              if (useSettings.getState().debugMode) {
                console.log(`[DEBUG] fetch response (OK) for ${apiUrl}:`, data);
              }
              const entry = data?.[0];
              if (entry) {
                const phoneticWithAudio = entry.phonetics?.find(
                  (p: any) => p.audio && p.audio.length > 0
                );

                if (phoneticWithAudio?.audio) {
                  const audioUrl = phoneticWithAudio.audio.startsWith('//')
                    ? `https:${phoneticWithAudio.audio}`
                    : phoneticWithAudio.audio;
                  if (pronunciationAudioRef.current) {
                    const { audio, blobUrl, timeoutId } =
                      pronunciationAudioRef.current;
                    clearTimeout(timeoutId);
                    audio.pause();
                    URL.revokeObjectURL(blobUrl);
                    pronunciationAudioRef.current = null;
                  }
                  fetch(audioUrl)
                    .then(audioResponse => audioResponse.blob())
                    .then(blob => {
                      const blobUrl = URL.createObjectURL(blob);
                      const audio = new Audio(blobUrl);
                      const timeoutId = window.setTimeout(() => {
                        audio.play().catch(e => console.error('Audio playback failed:', e));
                      }, 750);
                      pronunciationAudioRef.current = { audio, blobUrl, timeoutId };
                      audio.onended = () => {
                        URL.revokeObjectURL(blobUrl);
                        if (pronunciationAudioRef.current?.audio === audio) {
                          pronunciationAudioRef.current = null;
                        }
                      };
                    })
                    .catch(audioError => console.error('Error with pronunciation audio:', audioError));
                }

                result = {
                  word: entry.word,
                  phonetic: entry.phonetic,
                  definition: entry.meanings?.[0]?.definitions?.[0]?.definition,
                  example: entry.meanings?.[0]?.definitions?.[0]?.example,
                };
              } else {
                 result = { error: `Couldn't find a definition for "${fc.args.word}".` };
              }
            } else {
              if (useSettings.getState().debugMode) {
                console.log(
                  `[DEBUG] fetch response (Error ${response.status}) for ${apiUrl}`,
                );
              }
              result = { error: `Couldn't find a definition for "${fc.args.word}".` };
            }
          } catch (error) {
            if (useSettings.getState().debugMode) {
              console.error(
                `[DEBUG] fetch failed for word definition:`,
                error,
              );
            }
            result = { error: 'An error occurred while defining the word.' };
          }
        } else if (fc.name === 'read_web_page' && fc.args.url) {
            result = {
              status: 'success',
              message: `O conteúdo da página foi lido e estou pronto para discuti-lo.`,
            };
        } else if (fc.name === 'search_knowledge_base' && fc.args.query) {
          try {
            const folder = await findFolderByName(FOLDER_NAME);
            if (!folder) {
              result = { error: `A pasta da base de conhecimento "${FOLDER_NAME}" não foi encontrada no seu Google Drive.` };
            } else {
              const files = await searchFiles(fc.args.query as string, folder.id);
              if (files.length === 0) {
                result = { error: `Nenhum arquivo relevante encontrado na base de conhecimento para a consulta: "${fc.args.query}".` };
              } else {
                const topResult = files[0];
                const contentBlob = await downloadFileContent(topResult.id);
                const contentText = await contentBlob.text();
                result = {
                  fileName: topResult.name,
                  content: contentText.substring(0, 8000),
                  message: 'Conteúdo do arquivo recuperado com sucesso.',
                };
                sourceFile = { name: topResult.name, id: topResult.id };
                addTurn({
                   role: 'system',
                   text: `Arquivo encontrado: **${topResult.name}**. Lendo o conteúdo...`,
                   isFinal: true,
                });
              }
            }
          } catch (error: any) {
             result = { error: `Ocorreu um erro ao pesquisar a base de conhecimento: ${error.message}` };
          }
        } else {
          result = { status: 'ok' };
        }
        functionResponses.push({ id: fc.id, name: fc.name, response: { result } });

        if (sourceFile) {
            const lastTurn = useLogStore.getState().turns.at(-1);
            if (lastTurn?.role === 'agent') {
              updateLastTurn({ sourceFile });
            } else {
              addTurn({ role: 'agent', text: '', isFinal: false, sourceFile });
            }
        }
      }

      client.sendToolResponse({ functionResponses });
    };

    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('error', onError);
    client.on('interrupted', stopAudioStreamer);
    client.on('audio', onAudio);
    client.on('toolcall', onToolCall);

    return () => {
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('error', onError);
      client.off('interrupted', stopAudioStreamer);
      client.off('audio', onAudio);
      client.off('toolcall', onToolCall);
    };
  }, [client, findFolderByName, searchFiles, downloadFileContent]);

  const connect = useCallback(async () => {
    setError(null); // Limpa erros anteriores a cada nova tentativa de conexão.
    try {
        const { systemPrompt, voice } = useSettings.getState();
        const { turns } = useLogStore.getState();
        const { tools: rawTools } = useTools.getState();

        const tools = sanitizeToolsForApi(rawTools, 'live');

        const history: Content[] = turns
          .filter(turn => turn.role === 'user' || turn.role === 'agent')
          .map(turn => {
            const parts: Part[] = [];
            if (turn.text) {
              parts.push({ text: turn.text });
            }
            if (turn.image) {
              const [meta, base64Data] = turn.image.split(',');
              const mimeType = meta.split(':')[1].split(';')[0];
              parts.push({
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              });
            }
            return {
              role: (turn.role === 'agent' ? 'model' : 'user') as 'user' | 'model',
              parts: parts,
            };
          }).filter(content => content.parts.length > 0);

        const dynamicConfig: LiveConnectConfig = {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        };

        // Conditionally add tools to config only if valid tools exist
        if (tools && tools.length > 0) {
            dynamicConfig.tools = tools;
        }

        if (systemPrompt && systemPrompt.trim()) {
          dynamicConfig.systemInstruction = systemPrompt;
        }
    
    if (useSettings.getState().debugMode) {
      console.log('[DEBUG] client.connect with config:', dynamicConfig);
    }

    await audioRecorderRef.current.start();
    setInputAnalyser(audioRecorderRef.current.analyser);
    await client.connect(dynamicConfig, history);
    } catch (err: any) {
        let message = 'Falha ao iniciar a sessão de áudio.';
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
            message = 'Permissão do microfone negada. Por favor, habilite o acesso nas configurações do seu navegador.';
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
            message = 'Nenhum microfone encontrado. Por favor, conecte um microfone e tente novamente.';
        } else if (err.message && err.message.includes('invalid argument')) {
            message = 'A conexão falhou devido a uma configuração inválida na persona. Verifique se as ferramentas selecionadas são compatíveis com a API Live.';
        } else if (err.message) {
            message = err.message;
        }
        setError(message);
        audioRecorderRef.current.stop(); // Garante que o microfone seja liberado em caso de falha.
    }
  }, [client]);

  const disconnect = useCallback(() => {
    client.disconnect();
    setInputAnalyser(undefined);
    setVideoStream(null);
  }, [client]);

  const toggleMute = useCallback(() => setMuted(prev => !prev), []);

  const toggleVideo = useCallback(async () => {
    if (videoStream) {
        // Stop all tracks
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setVideoStream(stream);
        } catch (e) {
            console.error("Error accessing camera:", e);
            setError("Falha ao acessar a câmera. Verifique as permissões.");
        }
    }
  }, [videoStream]);

  const handleRecordingStop = useCallback(() => {
    const streamer = audioStreamerRef.current;
    if (!streamer) return;

    const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });

    if (micSourceInOutputCtxRef.current) {
      micSourceInOutputCtxRef.current.disconnect();
      micSourceInOutputCtxRef.current = null;
    }
    if (mixerDestinationRef.current) {
      streamer.gainNode.disconnect(mixerDestinationRef.current);
      mixerDestinationRef.current = null;
    }

    const { turns, currentConversationId } = useLogStore.getState();
    const { conversations } = useHistoryStore.getState();
    const currentConversation = conversations[currentConversationId];

    let baseTitle = 'conversa';
    if (
      currentConversation?.title &&
      currentConversation.title !== 'Nova Conversa'
    ) {
      baseTitle = currentConversation.title;
    } else {
      const firstUserTurn = turns.find(t => t.role === 'user');
      if (firstUserTurn) {
        baseTitle = firstUserTurn.text.substring(0, 30);
      }
    }
    const filenameBase = baseTitle.replace(/[\s\W_]+/g, '-').toLowerCase();
    const filename = `${filenameBase}_${
      new Date().toISOString().split('T')[0]
    }.webm`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
    setRecordingStatus('idle');
  }, []);

  const startRecording = useCallback(() => {
    const micStream = audioRecorderRef.current.stream;
    const streamer = audioStreamerRef.current;
    if (!micStream || !streamer) return;

    const outputCtx = streamer.context;
    const mixerDestination = outputCtx.createMediaStreamDestination();
    mixerDestinationRef.current = mixerDestination;

    micSourceInOutputCtxRef.current =
      outputCtx.createMediaStreamSource(micStream);

    streamer.gainNode.connect(mixerDestination);
    micSourceInOutputCtxRef.current.connect(mixerDestination);

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(mixerDestination.stream, {
      mimeType: 'audio/webm',
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = event => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data);
    };

    recorder.onstop = handleRecordingStop;

    recorder.start();
    setRecordingStatus('recording');
    setRecordingTime(0);
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, [handleRecordingStop]);
  
  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecordingStatus('processing');
  }, []);

  const toggleRecording = useCallback(() => {
    if (recordingStatus === 'recording') {
      stopRecording();
    } else if (recordingStatus === 'idle') {
      startRecording();
    }
  }, [recordingStatus, startRecording, stopRecording]);

  const clearError = useCallback(() => setError(null), []);

  return useMemo(() => ({
    client,
    connect,
    connected,
    disconnect,
    volume,
    toggleMute,
    muted,
    toggleVideo,
    videoStream,
    toggleRecording,
    recordingStatus,
    recordingTime,
    speakingTime,
    inputAnalyser,
    outputAnalyser,
    agentAudioStream,
    error,
    clearError,
  }), [
    client, connect, connected, disconnect, volume, toggleMute, muted,
    toggleVideo, videoStream, toggleRecording, recordingStatus,
    recordingTime, speakingTime, inputAnalyser, outputAnalyser,
    agentAudioStream, error, clearError
  ]);
}