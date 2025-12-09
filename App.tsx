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

import { useEffect } from 'react';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';
import { GoogleDriveProvider } from './contexts/GoogleDriveContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { useUI } from './lib/state';
import PresentationView from './components/demo/presentation-view/PresentationView';
import cn from 'classnames';
import HomeScreen from './components/home/HomeScreen';
import PersonaManagementScreen from './components/persona-management/PersonaManagementScreen';
import WelcomeModal from './components/welcome-modal/WelcomeModal';
import PiPManager from './components/PiPManager';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error(
    'Missing required environment variable: API_KEY. The application cannot start without it.'
  );
}

const GOOGLE_DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;

function App() {
  const { view, isPresentationMode, togglePresentationMode, isFocusMode, isPersonaManagementOpen, isWelcomeModalOpen, setWelcomeModalOpen, isSettingsOpen, isHistoryOpen } = useUI();

  useEffect(() => {
    if (!localStorage.getItem('gemini-live-sandbox-visited')) {
      setWelcomeModalOpen(true);
    }
  }, [setWelcomeModalOpen]);

  return (
    <div className="App">
      <GoogleDriveProvider
        apiKey={GOOGLE_DRIVE_API_KEY}
        clientId={GOOGLE_DRIVE_CLIENT_ID}
      >
        <LiveAPIProvider apiKey={API_KEY}>
          {isWelcomeModalOpen && <WelcomeModal />}
          {isPersonaManagementOpen && <PersonaManagementScreen />}
          {isPresentationMode && <PresentationView onClose={togglePresentationMode} />}
          <ErrorScreen />
          <PiPManager />

          {view === 'home' && <HomeScreen />}
          
          {view === 'chat' && (
            <div className={cn('chat-layout', { 'focus-mode': isFocusMode, 'settings-closed': !isSettingsOpen, 'history-closed': !isHistoryOpen })}>
              <Sidebar />
              <main className="chat-main">
                <Header />
                <div className="streaming-console-container">
                  <StreamingConsole />
                </div>
                <ControlTray />
              </main>
              <RightSidebar />
            </div>
          )}

        </LiveAPIProvider>
      </GoogleDriveProvider>
    </div>
  );
}

export default App;