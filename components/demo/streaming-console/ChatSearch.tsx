/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useUI } from '../../../lib/state';

interface ChatSearchProps {
  onNavigate: (direction: 'next' | 'prev') => void;
  onQueryChange: (query: string) => void;
}

const ChatSearch: React.FC<ChatSearchProps> = ({
  onNavigate,
  onQueryChange,
}) => {
  const { toggleSearch, searchQuery, searchResults, currentSearchResultIndex } =
    useUI();
  const resultCount = searchResults.length;
  const currentResultNum = currentSearchResultIndex + 1;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (resultCount === 0) return;
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        onNavigate('prev');
      } else {
        onNavigate('next');
      }
    }
  };

  return (
    <div className="chat-search-bar">
      <input
        type="text"
        placeholder="Pesquisar..."
        value={searchQuery}
        onChange={e => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <span className="search-results-count">
        {resultCount > 0
          ? `${currentResultNum} de ${resultCount}`
          : searchQuery
            ? '0 resultados'
            : ''}
      </span>
      <div className="search-nav-buttons">
        <button
          onClick={() => onNavigate('prev')}
          disabled={resultCount === 0}
          aria-label="Resultado anterior"
        >
          <span className="icon">keyboard_arrow_up</span>
        </button>
        <button
          onClick={() => onNavigate('next')}
          disabled={resultCount === 0}
          aria-label="Próximo resultado"
        >
          <span className="icon">keyboard_arrow_down</span>
        </button>
      </div>
      <button
        onClick={toggleSearch}
        className="close-search-button"
        aria-label="Fechar busca"
      >
        <span className="icon">close</span>
      </button>
    </div>
  );
};

export default ChatSearch;
