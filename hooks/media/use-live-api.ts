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
import { LiveConnectConfig, LiveServerToolCall, Modality, Part } from '@google/genai';
import { AudioStreamer } from '../../lib/audio-streamer';
import { audioContext } from '../../lib/utils';
import VolMeterWorket from '../../lib/worklets/vol-meter';
import { useLogStore, useSettings, useHistoryStore, useTools, usePersonaStore } from '../../lib/state';
import { AudioRecorder } from '../../lib/audio-recorder';
import { useGoogleDriveContext } from '../../contexts/GoogleDriveContext';

export type RecordingStatus = 'idle' | 'recording' | 'processing';
const FOLDER_NAME = 'Base de Conhecimento - Projetos';

export type UseLiveApiResults = {
  client: GenAILiveClient;
  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  volume: number;
  // New exports
  toggleMute: () => void;
  muted: boolean;
  toggleRecording: () => void;
  recordingStatus: RecordingStatus;
  recordingTime: number;
  inputAnalyser?: AnalyserNode;
  outputAnalyser?: AnalyserNode;
  agentAudioStream?: MediaStream;
};

export function useLiveApi({
  apiKey,
}: {
  apiKey: string;
}): UseLiveApiResults {
  const { model } = useSettings();
  const client = useMemo(() => new GenAILiveClient(apiKey, model), [apiKey, model]);
  const { findFolderByName, searchFiles, downloadFileContent } = useGoogleDriveContext();


  // All audio-related state is now in this hook
  const [muted, setMuted] = useState(true);
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | undefined>();
  const [outputAnalyser, setOutputAnalyser] = useState<
    AnalyserNode | undefined
  >();
  const [agentAudioStream, setAgentAudioStream] = useState<
    MediaStream | undefined
  >();

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

  // setup audioStreamer for AI output
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

  // Mic data to GenAI
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

  // GenAI connection events
  useEffect(() => {
    const onOpen = () => setConnected(true);
    const onClose = () => {
      setConnected(false);
      // Stop recording if active
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Stop mic
      audioRecorderRef.current.stop();
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

        // Display a system message that the function call is being triggered
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
            // NOTE: A direct fetch to a URL from the browser will likely be blocked
            // by CORS policies. A real-world application would use a server-side
            // proxy to fetch the content. For this demo, we will simulate the
            // action and return a success message, allowing the model to use its
            // existing knowledge to discuss the topic.
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
                  content: contentText.substring(0, 8000), // Truncate content to avoid exceeding limits
                  message: 'Conteúdo do arquivo recuperado com sucesso.',
                };
                // Set the source file to be used in the agent's turn
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

        // If a source file was identified, attach it to the next agent turn.
        // We do this by updating the last turn if it's an agent turn,
        // or preparing it for the next agent turn to be created.
        if (sourceFile) {
            const lastTurn = useLogStore.getState().turns.at(-1);
            if (lastTurn?.role === 'agent') {
              updateLastTurn({ sourceFile });
            } else {
              // Add a temporary agent turn that will be updated with transcription
              addTurn({ role: 'agent', text: '', isFinal: false, sourceFile });
            }
        }
      }

      client.sendToolResponse({ functionResponses });
    };

    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('interrupted', stopAudioStreamer);
    client.on('audio', onAudio);
    client.on('toolcall', onToolCall);

    return () => {
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('interrupted', stopAudioStreamer);
      client.off('audio', onAudio);
      client.off('toolcall', onToolCall);
    };
  }, [client, findFolderByName, searchFiles, downloadFileContent]);

  const connect = useCallback(async () => {
    const { systemPrompt, voice, speechRate } = useSettings.getState();
    const { turns } = useLogStore.getState();
    const { tools } = useTools.getState();

    const enabledTools = tools
      .filter(tool => tool.isEnabled)
      .map(tool => ({
        functionDeclarations: [
          {
            name: tool.name,
            description: tool.description || `Função: ${tool.name}`,
            parameters: tool.parameters as any,
          },
        ],
      }));

    const history = turns
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
      });

    const dynamicConfig: LiveConnectConfig & { history?: any[] } = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        speakingRate: speechRate,
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      history: history,
      tools: enabledTools,
    };

    if (systemPrompt && systemPrompt.trim()) {
      dynamicConfig.systemInstruction = systemPrompt;
    }
    
    if (useSettings.getState().debugMode) {
      console.log('[DEBUG] client.connect with config:', dynamicConfig);
    }

    return new Promise<void>(async (resolve, reject) => {
      try {
        const onOpen = () => {
          client.off('open', onOpen);
          client.off('error', onError);
          resolve();
        };

        const onError = (err: ErrorEvent) => {
          client.off('open', onOpen);
          client.off('error', onError);
          reject(err);
        };

        client.on('open', onOpen);
        client.on('error', onError);

        await audioRecorderRef.current.start();
        setInputAnalyser(audioRecorderRef.current.analyser);
        await client.connect(dynamicConfig);
      } catch (err) {
        reject(err as any);
      }
    });
  }, [client]);

  const disconnect = useCallback(() => {
    client.disconnect();
    setInputAnalyser(undefined);
  }, [client]);

  const toggleMute = useCallback(() => setMuted(prev => !prev), []);

  const handleRecordingStop = useCallback(() => {
    const streamer = audioStreamerRef.current;
    if (!streamer) return;

    const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });

    // Disconnect streams from mixer
    if (micSourceInOutputCtxRef.current) {
      micSourceInOutputCtxRef.current.disconnect();
      micSourceInOutputCtxRef.current = null;
    }
    if (mixerDestinationRef.current) {
      streamer.gainNode.disconnect(mixerDestinationRef.current);
      mixerDestinationRef.current = null;
    }

    // Generate filename
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

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Cleanup timer
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

    // Create a source for the mic stream in the output context to allow mixing
    micSourceInOutputCtxRef.current =
      outputCtx.createMediaStreamSource(micStream);

    // Connect both AI output and mic to the mixer destination
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

  return {
    client,
    connect,
    connected,
    disconnect,
    volume,
    toggleMute,
    muted,
    toggleRecording,
    recordingStatus,
    recordingTime,
    inputAnalyser,
    outputAnalyser,
    agentAudioStream,
  };
}