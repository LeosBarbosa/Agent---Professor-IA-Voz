
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

import { audioContext } from './utils';
import AudioRecordingWorklet from './worklets/audio-processing';
import VolMeterWorket from './worklets/vol-meter';

import { createWorketFromSrc } from './audioworklet-registry';
import EventEmitter from 'eventemitter3';

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder {
  private emitter = new EventEmitter();

  public on = this.emitter.on.bind(this.emitter);
  public off = this.emitter.off.bind(this.emitter);

  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;
  analyser: AnalyserNode | undefined;

  private starting: Promise<void> | null = null;
  private stopped: boolean = false;

  constructor(public sampleRate = 16000) {}

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Could not request user media');
    }

    if (this.starting) {
      return this.starting;
    }

    this.stopped = false;

    this.starting = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (this.stopped) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        this.stream = stream;
        this.audioContext = await audioContext({ sampleRate: this.sampleRate });
        
        if (this.stopped) {
            this.stream.getTracks().forEach(track => track.stop());
            this.audioContext.close();
            return;
        }

        this.source = this.audioContext.createMediaStreamSource(this.stream);

        const workletName = 'audio-recorder-worklet';
        const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

        await this.audioContext.audioWorklet.addModule(src);
        this.recordingWorklet = new AudioWorkletNode(
          this.audioContext,
          workletName
        );

        this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
          // Worklet processes recording floats and messages converted buffer
          const arrayBuffer = ev.data.data.int16arrayBuffer;

          if (arrayBuffer) {
            const arrayBufferString = arrayBufferToBase64(arrayBuffer);
            this.emitter.emit('data', arrayBufferString);
          }
        };
        this.source.connect(this.recordingWorklet);

        // vu meter worklet
        const vuWorkletName = 'vu-meter';
        await this.audioContext.audioWorklet.addModule(
          createWorketFromSrc(vuWorkletName, VolMeterWorket)
        );
        this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
        this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
          this.emitter.emit('volume', ev.data.volume);
        };

        this.source.connect(this.vuWorklet);

        // Analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.source.connect(this.analyser);

        this.recording = true;
      } catch (error) {
        this.stop();
        throw error;
      } finally {
        this.starting = null;
      }
    })();

    return this.starting;
  }

  stop() {
    this.stopped = true;
    if (this.source) {
      try {
        if (this.recordingWorklet) {
          this.recordingWorklet.disconnect();
          this.source.disconnect(this.recordingWorklet);
        }
        if (this.vuWorklet) {
          this.vuWorklet.disconnect();
          this.source.disconnect(this.vuWorklet);
        }
        if (this.analyser) {
          this.analyser.disconnect();
          this.source.disconnect(this.analyser);
        }
        this.source.disconnect();
      } catch (e) {
        console.warn('Error disconnecting audio nodes during stop:', e);
      }
    }
    
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.recordingWorklet = undefined;
    this.vuWorklet = undefined;
    this.analyser = undefined;
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(e => console.warn('Error closing AudioContext:', e));
    }
    this.audioContext = undefined;
  }
}
