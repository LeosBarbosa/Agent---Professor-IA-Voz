/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, memo } from 'react';
import cn from 'classnames';

type AgentAvatarProps = {
  volume: number;
  isAgentThinking: boolean;
  icon?: string;
};

const AgentAvatar: React.FC<AgentAvatarProps> = ({ volume, isAgentThinking, icon }) => {
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);

  // Animate based on volume
  useEffect(() => {
    if (displacementRef.current) {
      // Scale the displacement based on volume.
      // Add a base value to keep it moving even with low volume.
      const scale = 20 + volume * 150;
      // Use setAttribute for better performance in animations
      displacementRef.current.setAttribute('scale', scale.toString());
    }
  }, [volume]);

  // Gentle morphing animation for turbulence
  useEffect(() => {
    const turbulence = turbulenceRef.current;
    if (!turbulence) return;

    let bfx = 0.01;
    let bfy = 0.01;
    let bfx_d = 0.0015;
    let bfy_d = 0.001;
    let animFrameId: number;

    const animate = () => {
      bfx += bfx_d;
      bfy += bfy_d;

      if (bfx >= 0.02 || bfx <= 0.005) {
        bfx_d *= -1;
      }
      if (bfy >= 0.015 || bfy <= 0.005) {
        bfy_d *= -1;
      }

      turbulence.setAttribute('baseFrequency', `${bfx} ${bfy}`);
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  const isSpeaking = volume > 0.01;

  return (
    <div className="agent-avatar-container">
      <svg
        className={cn('agent-avatar-svg', {
          thinking: isAgentThinking,
          speaking: isSpeaking,
        })}
        viewBox="0 0 400 400"
      >
        <defs>
          <filter id="organic-filter">
            <feTurbulence
              ref={turbulenceRef}
              id="turbulence"
              type="fractalNoise"
              baseFrequency="0.01 0.01"
              numOctaves="2"
              result="turbulence"
            />
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="turbulence"
              scale="20"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displacement"
            />
          </filter>
        </defs>
        <circle
          cx="200"
          cy="200"
          r="100"
          fill="var(--accent-blue)"
          filter="url(#organic-filter)"
          id="organic-shape"
        />
        {icon && (
          <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            className="material-symbols-outlined"
            style={{
              fontSize: '90px',
              fill: 'var(--Neutral-90)',
              pointerEvents: 'none',
              opacity: 0.9,
            }}
          >
            {icon}
          </text>
        )}
      </svg>
    </div>
  );
};

export default memo(AgentAvatar);