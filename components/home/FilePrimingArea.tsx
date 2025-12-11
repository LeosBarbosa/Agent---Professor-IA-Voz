
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef } from 'react';
import { useFileStore } from '../../lib/state';

function FilePrimingArea() {
  const { files, addFile, removeFile } = useFileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file.type.startsWith('text/')) {
        alert(`Arquivo '${file.name}' não é um arquivo de texto e será ignorado.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        addFile({ name: file.name, content });
      };
      reader.onerror = () => {
        alert(`Erro ao ler o arquivo '${file.name}'.`);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-priming-area">
      <h3>Contexto Inicial (Opcional)</h3>
      <p>Adicione arquivos de texto para dar contexto à IA antes de iniciar a conversa. Isso funciona com qualquer persona.</p>
      <div className="file-input-container">
         <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".txt,.md,.csv,.json,.html,.xml,text/plain"
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()}>
          <span className="icon">upload_file</span>
          Carregar Arquivos
        </button>
        <button disabled title="A integração com o Google Drive requer configuração adicional.">
           <span className="icon">add_to_drive</span>
           Carregar do Drive
        </button>
      </div>
      {files.length > 0 && (
        <div className="file-list">
          <h4>Arquivos Carregados:</h4>
          {files.map(file => (
            <div key={file.name} className="file-item">
              <span className="icon">description</span>
              <span className="file-name" title={file.name}>{file.name}</span>
              <button onClick={() => removeFile(file.name)} title={`Remover ${file.name}`} aria-label={`Remover arquivo ${file.name}`}>
                <span className="icon">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FilePrimingArea;
