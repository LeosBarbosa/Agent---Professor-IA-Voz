/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => {
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      onClose();
    }
  };
  
  // Adjust position to ensure the menu stays within the viewport
  const getAdjustedPosition = () => {
    const menuWidth = 180; // Approximate width
    const menuHeight = items.length * 40; // Approximate height
    const { innerWidth, innerHeight } = window;

    let x = position.x;
    let y = position.y;

    if (x + menuWidth > innerWidth) {
      x = innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > innerHeight) {
      y = innerHeight - menuHeight - 10;
    }
    return { top: y, left: x };
  };

  return (
    <ul className="context-menu" ref={menuRef} style={getAdjustedPosition()} role="menu">
      {items.map((item, index) => (
        <li key={index} role="presentation">
          <button 
            onClick={() => handleItemClick(item)} 
            disabled={item.disabled}
            className="context-menu-item"
            role="menuitem"
            tabIndex={-1}
          >
            {item.icon && <span className="icon">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ContextMenu;