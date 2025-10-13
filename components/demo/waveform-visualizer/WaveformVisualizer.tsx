/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useEffect, memo } from 'react';

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode;
  barColor?: string;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyserNode,
  barColor = '#448dff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    // Set a consistent FFT size for the visualizer
    analyserNode.fftSize = 2048;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      // Get the time-domain data for the waveform
      analyserNode.getByteTimeDomainData(dataArray);

      // Clear the canvas with a semi-transparent background
      canvasCtx.fillStyle = 'rgba(28, 31, 33, 0)';
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = barColor;
      canvasCtx.beginPath();

      // Calculate the width of each segment of the line
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Normalize the data to a value between 0 and 1
        const v = dataArray[i] / 128.0;
        // Calculate the y position of the line segment
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserNode, barColor]);

  return <canvas ref={canvasRef} className="waveform-visualizer"></canvas>;
};

export default memo(WaveformVisualizer);