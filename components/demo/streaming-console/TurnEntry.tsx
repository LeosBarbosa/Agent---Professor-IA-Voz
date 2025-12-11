
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { memo } from 'react';
import { ConversationTurn, useUI } from '../../../lib/state';
import { renderContent } from '../../../lib/render-utils';

interface TurnEntryProps {
  turn: ConversationTurn;
  turnIndex: number;
}

const formatTimestamp = (date: Date) => {
  const pad = (num: number, size = 2) => num.toString().padStart(size, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3);
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const TurnEntry: React.FC<TurnEntryProps> = ({ turn: t, turnIndex }) => {
  // Use granular selectors to avoid re-rendering when unrelated state (like confidence) changes.
  const searchQuery = useUI(state => state.searchQuery);
  const searchResults = useUI(state => state.searchResults);
  const currentSearchResultIndex = useUI(state => state.currentSearchResultIndex);

  const renderTurnContent = () => {
    const text = t.text;
    if (!searchQuery) {
      return renderContent(text);
    }

    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    const safeQuery = escapeRegExp(searchQuery);
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    const parts = text.split(regex);
    let matchCounterForTurn = 0;

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a match
        const matchIndexInTurn = matchCounterForTurn++;
        const globalMatchIndex = searchResults.findIndex(
          r => r.turnIndex === turnIndex && r.matchIndex === matchIndexInTurn,
        );
        const isCurrent = globalMatchIndex === currentSearchResultIndex;

        return (
          <mark
            key={`match-${index}`}
            className={isCurrent ? 'current-match' : ''}
            data-global-match-index={globalMatchIndex}
          >
            {part}
          </mark>
        );
      } else {
        // This is not a match, apply original rendering
        return (
          <React.Fragment key={`part-${index}`}>
            {renderContent(part)}
          </React.Fragment>
        );
      }
    });
  };

  return (
    <div
      className={`transcription-entry ${t.role} ${!t.isFinal ? 'interim' : ''}`}
    >
      <div className="transcription-header">
        <div className="transcription-source">
          {t.role === 'user'
            ? 'Você'
            : t.role === 'agent'
              ? 'Agente'
              : 'Sistema'}
        </div>
        <div className="transcription-meta">
          <div className="transcription-timestamp">
            {formatTimestamp(t.timestamp)}
          </div>
          {t.role === 'user' && (
            <div className="read-receipt">
              {t.isRead ? (
                <span className="icon read">done_all</span>
              ) : t.isFinal ? (
                <span className="icon sent">done</span>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <div className="transcription-text-content">
        {t.image && (
          <div className="attached-image-container">
            <img
              src={t.image}
              alt="Imagem anexada pelo usuário"
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                borderRadius: '8px',
                marginTop: '8px',
              }}
            />
          </div>
        )}
        {renderTurnContent()}
      </div>
      {t.groundingChunks && t.groundingChunks.length > 0 && (
        <div className="grounding-chunks">
          <strong>Fontes:</strong>
          <ul>
            {t.groundingChunks
              .filter(chunk => chunk.web && chunk.web.uri)
              .map((chunk, index) => (
                <li key={index}>
                  <a
                    href={chunk.web!.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {chunk.web!.title || chunk.web!.uri}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}
      {t.sourceFile && (
        <div className="grounding-chunks">
          <strong>Fonte:</strong>
          <div className="source-file-chip">
            <span className="icon">description</span>
            <span>{t.sourceFile.name}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(TurnEntry);
