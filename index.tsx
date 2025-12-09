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

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Função de inicialização robusta para garantir que o app React possa ser montado.
const initializeReactApp = () => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    // Se o elemento root não for encontrado, exibe uma mensagem de erro clara
    // no corpo da página, pois o React não pode ser renderizado.
    document.body.innerHTML = `
      <div style="font-family: sans-serif; padding: 2rem; text-align: center; color: red;">
        <h1>Erro de Inicialização (Erro #185)</h1>
        <p>A aplicação React não pôde ser iniciada.</p>
        <p>O elemento <strong>&lt;div id="root"&gt;&lt;/div&gt;</strong> não foi encontrado no arquivo <code>index.html</code>.</p>
        <p>Verifique se o <code>index.html</code> foi salvo corretamente e contém este elemento no &lt;body&gt;.</p>
      </div>`;
    console.error("Erro Crítico: O elemento <div id='root'> não foi encontrado no index.html.");
    return;
  }

  // Tenta renderizar a aplicação React e captura qualquer erro que ocorra
  // durante a inicialização interna do React.
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (reactError) {
    console.error("Um erro ocorreu DENTRO do React, após a inicialização:", reactError);
    const errorMessage = reactError instanceof Error ? reactError.message : String(reactError);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px;">
        <h1>Erro Interno do React</h1>
        <p>${errorMessage}</p>
      </div>`;
  }
};

// Adiciona uma camada extra de segurança esperando o DOM estar completamente carregado
// antes de tentar executar a inicialização do React. O atributo 'defer' no script
// do index.html já deveria garantir isso, mas esta é uma salvaguarda adicional.
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeReactApp);
} else {
  // O DOM já está pronto.
  initializeReactApp();
}
