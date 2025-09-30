/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI, useTools, personaConfig } from '@/lib/state';

export default function Header() {
  const { toggleSidebar } = useUI();
  const { template } = useTools();
  const { title, subtitle } = personaConfig[template].header;

  return (
    <header>
      <div className="header-left">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-right">
        <button
          className="settings-button"
          onClick={toggleSidebar}
          aria-label="Configurações"
        >
          <span className="icon">tune</span>
        </button>
      </div>
    </header>
  );
}
