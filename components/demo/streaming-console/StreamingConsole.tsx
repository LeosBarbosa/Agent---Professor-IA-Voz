/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef, memo } from 'react';
import WelcomeScreen from '../welcome-screen/WelcomeScreen';
import { LiveServerContent } from '@google/genai';

import { useLiveAPIProvider } from '../../../contexts/LiveAPIContext';
import { useLogStore, useUI } from '../../../lib/state';
import AgentAvatar from './AgentAvatar';
import WaveformVisualizer from '../waveform-visualizer/WaveformVisualizer';
import TurnEntry from './TurnEntry';
import ChatSearch from './ChatSearch';

function StreamingConsole() {
  const {
    client,
    volume,
    inputAnalyser,
    outputAnalyser,
    muted,
  } = useLiveAPIProvider();
  const turns = useLogStore(state => state.turns);
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    view,
    isAgentThinking,
    setIsAgentThinking,
    setConfidence,
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    currentSearchResultIndex,
    setCurrentSearchResultIndex,
  } = useUI();

  useEffect(() => {
    const { addTurn, updateLastTurn, markLastUserTurnAsRead } =
      useLogStore.getState();

    const handleInputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns.at(-1);
      if (last && last.role === 'user' && !last.isFinal) {
        updateLastTurn({
          text: last.text + text,
          isFinal,
        });
      } else {
        addTurn({ role: 'user', text, isFinal });
      }
      if (isFinal) {
        setConfidence(c => Math.min(100, c + 1));
      }
    };

    const encouragingKeywords =
      /\b(Excellent|Great job|Well done|Perfect|Fantastic|Ótimo trabalho|Perfeito|Excelente)\b/i;

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns.at(-1);

      if (encouragingKeywords.test(text)) {
        setConfidence(c => Math.min(100, c + 5));
      }

      if (last && last.role === 'agent' && !last.isFinal) {
        updateLastTurn({
          text: last.text + text,
          isFinal,
        });
      } else {
        markLastUserTurnAsRead();
        addTurn({ role: 'agent', text, isFinal });
      }
    };

    const handleContent = (serverContent: LiveServerContent) => {
      const groundingChunks = serverContent.groundingMetadata?.groundingChunks;

      if (!groundingChunks) {
        return;
      }

      const { turns, updateLastTurn } = useLogStore.getState();
      const last = turns.at(-1);

      if (last?.role === 'agent') {
        updateLastTurn({
          groundingChunks: [
            ...(last.groundingChunks || []),
            ...groundingChunks,
          ],
        });
      }
    };

    const handleTurnComplete = () => {
      const turns = useLogStore.getState().turns;
      const last = turns.at(-1);
      if (last && !last.isFinal) {
        updateLastTurn({ isFinal: true });
      }
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
    };
  }, [client, setConfidence]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, isAgentThinking]);

  useEffect(() => {
    const lastTurn = turns.at(-1);
    if (lastTurn?.role === 'user' && lastTurn.isFinal) {
      setIsAgentThinking(true);
    } else if (lastTurn?.role === 'agent') {
      setIsAgentThinking(false);
    }
  }, [turns, setIsAgentThinking]);

  // Search logic
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Effect to run search and update results array
  useEffect(() => {
    if (!isSearchOpen || !searchQuery) {
      setSearchResults([]);
      return;
    }

    const results: { turnIndex: number; matchIndex: number }[] = [];
    const safeQuery = escapeRegExp(searchQuery);
    const regex = new RegExp(safeQuery, 'gi');

    turns.forEach((turn, turnIndex) => {
      const matches = [...turn.text.matchAll(regex)];
      matches.forEach((_, matchIndex) => {
        results.push({ turnIndex, matchIndex });
      });
    });

    setSearchResults(results);
  }, [searchQuery, turns, isSearchOpen, setSearchResults]);

  // Effect to update the current result index when the results array changes
  useEffect(() => {
    setCurrentSearchResultIndex(searchResults.length > 0 ? 0 : -1);
  }, [searchResults, setCurrentSearchResultIndex]);


  const handleSearchNavigate = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    const nextIndex =
      direction === 'next'
        ? (currentSearchResultIndex + 1) % searchResults.length
        : (currentSearchResultIndex - 1 + searchResults.length) %
          searchResults.length;
    setCurrentSearchResultIndex(nextIndex);
  };

  useEffect(() => {
    if (currentSearchResultIndex < 0 || !scrollRef.current) return;

    const currentMatchElement = scrollRef.current.querySelector(
      `mark[data-global-match-index="${currentSearchResultIndex}"]`,
    );

    if (currentMatchElement) {
      currentMatchElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSearchResultIndex]);

  const isSpeaking = volume > 0.01;
  const isListening = !muted;
  const activeAnalyser = isSpeaking
    ? outputAnalyser
    : isListening
      ? inputAnalyser
      : null;
  const waveformColor = isSpeaking
    ? 'var(--accent-green)'
    : 'var(--accent-blue)';

  return (
    <>
      {isSearchOpen && (
        <ChatSearch
          onNavigate={handleSearchNavigate}
          onQueryChange={setSearchQuery}
        />
      )}
      {turns.length > 0 && view === 'chat' && (
        <AgentAvatar volume={volume} isAgentThinking={isAgentThinking} />
      )}
      {turns.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div className="transcription-view" ref={scrollRef}>
          {turns.map((t, i) => (
            <TurnEntry key={`${t.timestamp.getTime()}-${i}`} turn={t} turnIndex={i} />
          ))}
          {isAgentThinking && (
            <div className="transcription-entry agent thinking">
              <div className="transcription-header">
                <div className="transcription-source">Agente</div>
              </div>
              <div className="transcription-text-content">
                <div className="thinking-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="waveform-container">
        {activeAnalyser && (
          <WaveformVisualizer
            analyserNode={activeAnalyser}
            barColor={waveformColor}
          />
        )}
      </div>
    </>
  );
}

export default memo(StreamingConsole);