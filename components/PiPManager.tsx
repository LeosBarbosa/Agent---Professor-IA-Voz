
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useCallback } from 'react';
import AgentAvatar from './demo/streaming-console/AgentAvatar';
import { useUI, usePersonaStore } from '../lib/state';
import { useLiveAPIProvider, useLiveAPIVolume } from '../contexts/LiveAPIContext';

/**
 * A component that manages the native browser Picture-in-Picture (PiP) functionality.
 * It works by:
 * 1. Rendering a hidden AgentAvatar component.
 * 2. Continuously drawing the avatar's SVG onto a hidden canvas.
 * 3. Capturing a video stream from the canvas and an audio stream from the AI agent.
 * 4. Combining these into a single MediaStream for a hidden video element.
 * 5. Requesting PiP on the hidden video element, which the browser then displays.
 * This ensures both audio and video are present in the PiP window and continue to
 * play even when the main app window is minimized.
 */
const PiPManager: React.FC = () => {
  const { isPiPMode, setIsPiPMode, view, isAgentThinking } = useUI();
  const { agentAudioStream } = useLiveAPIProvider();
  const { volume } = useLiveAPIVolume();
  const { activePersona } = usePersonaStore();

  const avatarContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const drawToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = avatarContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const svgEl = container.querySelector('svg');
    if (!ctx || !svgEl) return;

    // To render an SVG to canvas, we convert it to a data URL.
    // This captures its current state, including attribute changes from props (like volume).
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Manually draw the icon on the canvas because the font in SVG blob might not be loaded.
      if (activePersona?.icon) {
        ctx.font = '90px "Material Symbols Outlined"';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activePersona.icon, canvas.width / 2, canvas.height / 2);
      }

      URL.revokeObjectURL(url); // Clean up the blob URL to prevent memory leaks.
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [activePersona]);

  // Set up the animation loop to continuously draw the avatar to the canvas.
  useEffect(() => {
    if (view !== 'chat') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = () => {
      drawToCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawToCanvas, view]);

  // This useEffect hook is responsible for setting up the MediaStream for the PiP window.
  // It combines the visual feed from the canvas (the agent avatar) with the audio feed
  // from the AI agent's voice into a single stream.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // 1. Capture the canvas as a video stream.
    const videoStream = canvas.captureStream(30); // 30 fps
    const videoTrack = videoStream.getVideoTracks()[0];

    // 2. Get the audio track from the agent's voice stream.
    const audioTrack = agentAudioStream?.getAudioTracks()[0];

    // 3. Combine video and audio tracks into a new MediaStream.
    const tracks = [];
    if (videoTrack) tracks.push(videoTrack);
    if (audioTrack) tracks.push(audioTrack);
    const combinedStream = new MediaStream(tracks);

    // 4. Assign the combined stream to our hidden video element.
    video.srcObject = combinedStream;
    // The video element must be unmuted for the audio to play in the PiP window.
    video.muted = false;
    // Programmatically play the video element. This is required for PiP.
    video.play().catch(e => console.error('Error playing PiP video:', e));

    // Cleanup function to stop tracks when the component unmounts or dependencies change.
    return () => {
      combinedStream.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [agentAudioStream]);


  // This useEffect hook manages entering and exiting the browser's native PiP mode
  // by calling the `requestPictureInPicture` API on the video element.
  // It is triggered by changes in the `isPiPMode` global