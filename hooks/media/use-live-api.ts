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
import { LiveConnectConfig, Modality, LiveServerToolCall } from '@google/genai';
import { AudioStreamer } from '../../lib/audio-streamer';
import { audioContext } from '../../lib/utils';
import VolMeterWorket from '../../lib/worklets/vol-meter';
import { useLogStore, useSettings } from '@/lib/state';

export type UseLiveApiResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;

  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;

  volume: number;
};

export function useLiveApi({
  apiKey,
}: {
  apiKey: string;
}): UseLiveApiResults {
  const { model } = useSettings();
  const client = useMemo(() => new GenAILiveClient(apiKey, model), [apiKey, model]);

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const pronunciationAudioRef = useRef<{
    audio: HTMLAudioElement;
    blobUrl: string;
    timeoutId: number;
  } | null>(null);

  const [volume, setVolume] = useState(0);
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConnectConfig>({});

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: 'audio-out' }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>('vumeter-out', VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          })
          .catch(err => {
            console.error('Error adding worklet:', err);
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
    };

    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop();
      }
    };

    const onAudio = (data: ArrayBuffer) => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.addPCM16(new Uint8Array(data));
      }
    };

    // Bind event listeners
    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('interrupted', stopAudioStreamer);
    client.on('audio', onAudio);

    const onToolCall = async (toolCall: LiveServerToolCall) => {
      const functionResponses: any[] = [];

      for (const fc of toolCall.functionCalls) {
        // Log the function call trigger
        const triggerMessage = `Triggering function call: **${
          fc.name
        }**\n\`\`\`json\n${JSON.stringify(fc.args, null, 2)}\n\`\`\``;
        useLogStore.getState().addTurn({
          role: 'system',
          text: triggerMessage,
          isFinal: true,
        });

        let result: any;

        if (fc.name === 'define_word' && fc.args.word) {
          try {
            const word = fc.args.word as string;
            const response = await fetch(
              `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
            );

            if (response.ok) {
              const data = await response.json();
              const entry = data[0];
              const phoneticWithAudio = entry.phonetics?.find(
                (p: any) => p.audio && p.audio.length > 0
              );

              if (phoneticWithAudio?.audio) {
                // Prepend protocol if missing, e.g. //api.dictionaryapi.dev/...
                const audioUrl = phoneticWithAudio.audio.startsWith('//')
                  ? `https:${phoneticWithAudio.audio}`
                  : phoneticWithAudio.audio;

                // Stop and clean up any currently playing/scheduled audio
                if (pronunciationAudioRef.current) {
                  const { audio, blobUrl, timeoutId } =
                    pronunciationAudioRef.current;
                  clearTimeout(timeoutId);
                  audio.pause();
                  URL.revokeObjectURL(blobUrl);
                  pronunciationAudioRef.current = null;
                }

                // Fetch and play audio with a delay, preventing overlaps
                fetch(audioUrl)
                  .then(audioResponse => {
                    if (!audioResponse.ok) {
                      throw new Error(
                        'Network response was not ok for audio file.',
                      );
                    }
                    return audioResponse.blob();
                  })
                  .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    const audio = new Audio(blobUrl);

                    const timeoutId = window.setTimeout(() => {
                      audio.play().catch(e => {
                        console.error('Audio playback failed:', e);
                        URL.revokeObjectURL(blobUrl);
                        if (pronunciationAudioRef.current?.audio === audio) {
                          pronunciationAudioRef.current = null;
                        }
                      });
                    }, 750); // 750ms delay before playing

                    pronunciationAudioRef.current = {
                      audio,
                      blobUrl,
                      timeoutId,
                    };

                    audio.onended = () => {
                      URL.revokeObjectURL(blobUrl);
                      if (pronunciationAudioRef.current?.audio === audio) {
                        pronunciationAudioRef.current = null;
                      }
                    };
                  })
                  .catch(audioError => {
                    console.error(
                      'Error fetching or playing pronunciation audio:',
                      audioError,
                    );
                    if (pronunciationAudioRef.current) {
                      clearTimeout(pronunciationAudioRef.current.timeoutId);
                      URL.revokeObjectURL(pronunciationAudioRef.current.blobUrl);
                      pronunciationAudioRef.current = null;
                    }
                  });
              }

              const ipaTranscriptions = entry.phonetics
                ?.map((p: any) => p.text)
                .filter(Boolean);

              // Prepare a structured result for the model
              result = {
                word: entry.word,
                phonetic: entry.phonetic || ipaTranscriptions?.[0],
                ipaTranscriptions: ipaTranscriptions,
                definition: entry.meanings[0]?.definitions[0]?.definition,
                example: entry.meanings[0]?.definitions[0]?.example,
              };
            } else {
              result = {
                error: `Sorry, I couldn't find a definition for "${fc.args.word}".`,
              };
            }
          } catch (error) {
            console.error('Error fetching word definition:', error);
            result = {
              error: 'An error occurred while trying to define the word.',
            };
          }
        } else {
          // For other tools or if args are missing, provide a default response.
          result = { status: 'ok' };
        }

        // Prepare the response for this function call
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result },
        });
      }

      // Log the function call response
      if (functionResponses.length > 0) {
        const responseMessage = `Function call response:\n\`\`\`json\n${JSON.stringify(
          functionResponses.map(r => r.response.result),
          null,
          2,
        )}\n\`\`\``;
        useLogStore.getState().addTurn({
          role: 'system',
          text: responseMessage,
          isFinal: true,
        });
      }

      client.sendToolResponse({ functionResponses });
    };

    client.on('toolcall', onToolCall);

    return () => {
      // Clean up event listeners
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('interrupted', stopAudioStreamer);
      client.off('audio', onAudio);
      client.off('toolcall', onToolCall);
    };
  }, [client]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error('config has not been set');
    }
    client.disconnect();
    await client.connect(config);
  }, [client, config]);

  const disconnect = useCallback(async () => {
    // Stop and clean up any pronunciation audio on disconnect
    if (pronunciationAudioRef.current) {
      const { audio, blobUrl, timeoutId } = pronunciationAudioRef.current;
      clearTimeout(timeoutId);
      audio.pause();
      URL.revokeObjectURL(blobUrl);
      pronunciationAudioRef.current = null;
    }
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connect,
    connected,
    disconnect,
    volume,
  };
}
