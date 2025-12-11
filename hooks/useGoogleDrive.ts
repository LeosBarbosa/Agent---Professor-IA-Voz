
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSettings } from '../lib/state';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export interface GoogleUserProfile {
  name: string;
  email: string;
  imageUrl: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  iconLink: string;
}

export interface UseGoogleDriveResults {
  isDriveApiReady: boolean;
  isSignedIn: boolean;
  profile: GoogleUserProfile | null;
  handleAuthClick: () => void;
  handleSignoutClick: () => void;
  showPicker: (callback: (content: string) => void) => void;
  uploadFile: (content: string, filename: string) => Promise<void>;
  findFolderByName: (name: string) => Promise<{ id: string; name: string } | null>;
  createFolder: (name: string) => Promise<{ id: string; name: string }>;
  listFiles: (folderId: string) => Promise<DriveFile[]>;
  downloadFileContent: (fileId: string) => Promise<Blob>;
  searchFiles: (query: string, folderId: string) => Promise<DriveFile[]>;
}

export function useGoogleDrive({
  apiKey,
  clientId,
}: {
  apiKey?: string;
  clientId?: string;
}): UseGoogleDriveResults {
  const [isDriveApiReady, setIsDriveApiReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [profile, setProfile] = useState<GoogleUserProfile | null>(null);
  const tokenClientRef = useRef<any>(null);
  const pickerApiLoadedRef = useRef(false);
  const gapiClientLoadedRef = useRef(false);

  const checkApiReady = useCallback(() => {
    if (gapiClientLoadedRef.current && pickerApiLoadedRef.current && tokenClientRef.current) {
        setIsDriveApiReady(true);
    }
  }, []);

  const gapiLoaded = useCallback(() => {
    window.gapi.load('client:picker', async () => {
      window.gapi.client.setApiKey(apiKey);
      await window.gapi.client.load(
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
      );
      await window.gapi.client.load(
        'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest',
      );
      gapiClientLoadedRef.current = true;
      pickerApiLoadedRef.current = true;
      checkApiReady();
    });
  }, [apiKey, checkApiReady]);

  const gisLoaded = useCallback(() => {
    if (!clientId) return;
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: async (resp: any) => {
        if (resp.error) {
          console.error(resp.error);
          return;
        }
        setIsSignedIn(true);
        try {
          const res = await window.gapi.client.oauth2.userinfo.get();
          setProfile({
            name: res.result.name,
            email: res.result.email,
            imageUrl: res.result.picture,
          });
        } catch (err) {
          console.error('Failed to get user profile', err);
        }
      },
    });
    checkApiReady();
  }, [clientId, checkApiReady]);

  useEffect(() => {
    if (!apiKey || !clientId) return;

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = gapiLoaded;
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = gisLoaded;
    document.body.appendChild(gisScript);

    return () => {
      document.body.removeChild(gapiScript);
      document.body.removeChild(gisScript);
    };
  }, [apiKey, clientId, gapiLoaded, gisLoaded]);

  const handleAuthClick = useCallback(() => {
    if (tokenClientRef.current) {
      if (window.gapi.client.getToken() === null) {
        tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
      } else {
        tokenClientRef.current.requestAccessToken({ prompt: '' });
      }
    }
  }, []);

  const handleSignoutClick = useCallback(() => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
        setProfile(null);
      });
    }
  }, []);

  const uploadFile = useCallback(async (content: string, filename: string): Promise<void> => {
    if (!isSignedIn) {
      throw new Error('User not signed in');
    }

    const metadata = {
      name: filename,
      mimeType: 'application/json',
    };
    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
    );
    form.append('file', new Blob([content], { type: 'application/json' }));
    
    const uploadUrl =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      
    if (useSettings.getState().debugMode) {
      console.log(`[DEBUG] Google Drive Upload: POST ${uploadUrl}`, {
        metadata,
        content,
      });
    }

    const res = await fetch(
      uploadUrl,
      {
        method: 'POST',
        headers: new Headers({
          Authorization: `Bearer ${window.gapi.client.getToken().access_token}`,
        }),
        body: form,
      },
    );

    if (!res.ok) {
      const errorBody = await res.json();
      if (useSettings.getState().debugMode) {
        console.error(
          `[DEBUG] Google Drive Upload Failed (${res.status}):`,
          errorBody,
        );
      }
      throw new Error(
        `Failed to upload file: ${errorBody.error.message}`,
      );
    } else {
      if (useSettings.getState().debugMode) {
        console.log(`[DEBUG] Google Drive Upload Succeeded (${res.status}).`);
      }
    }
  }, [isSignedIn]);

  const showPicker = useCallback((callback: (content: string) => void) => {
    if (!isSignedIn || !pickerApiLoadedRef.current) return;

    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    view.setMimeTypes('application/json');

    const picker = new window.google.picker.PickerBuilder()
      .setAppId(clientId!.split('-')[0])
      .setOAuthToken(window.gapi.client.getToken().access_token)
      .addView(view)
      .setDeveloperKey(apiKey!)
      .setCallback(async (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          const fileId = doc.id;
          try {
            if (useSettings.getState().debugMode) {
              console.log(`[DEBUG] Google Drive Get File:`, { fileId });
            }
            const res = await window.gapi.client.drive.files.get({
              fileId: fileId,
              alt: 'media',
            });
            if (useSettings.getState().debugMode) {
              console.log(`[DEBUG] Google Drive Get File Response:`, {
                status: res.status,
                body: res.body,
              });
            }
            callback(res.body);
          } catch (error) {
            if (useSettings.getState().debugMode) {
              console.error(`[DEBUG] Google Drive Get File Failed:`, error);
            }
            console.error('Error fetching file content from Drive', error);
            alert('Falha ao carregar o conteúdo do arquivo do Google Drive.');
          }
        }
      })
      .build();
    picker.setVisible(true);
  }, [isSignedIn, apiKey, clientId]);
  
  const findFolderByName = useCallback(async (name: string) => {
    const res = await window.gapi.client.drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    if (res.result.files && res.result.files.length > 0) {
      return res.result.files[0];
    }
    return null;
  }, []);

  const createFolder = useCallback(async (name: string) => {
    const res = await window.gapi.client.drive.files.create({
      resource: {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id, name',
    });
    return res.result;
  }, []);

  const listFiles = useCallback(async (folderId: string) => {
    const res = await window.gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, iconLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 100,
    });
    return res.result.files || [];
  }, []);
  
  const downloadFileContent = useCallback(async (fileId: string): Promise<Blob> => {
     const accessToken = window.gapi.client.getToken().access_token;
     const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
     });
     if (!response.ok) {
        throw new Error(`Error downloading file: ${response.statusText}`);
     }
     return response.blob();
  }, []);

  const searchFiles = useCallback(async (query: string, folderId: string): Promise<DriveFile[]> => {
    // Escape single quotes in the query to prevent errors in the GDrive query language
    const escapedQuery = query.replace(/'/g, "\\'");
    const res = await window.gapi.client.drive.files.list({
      q: `'${folderId}' in parents and (fullText contains '${escapedQuery}' or name contains '${escapedQuery}') and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, iconLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 5, // Limit to the 5 most relevant/recent files
    });
    return res.result.files || [];
  }, []);

  return useMemo(() => ({
    isDriveApiReady,
    isSignedIn,
    profile,
    handleAuthClick,
    handleSignoutClick,
    uploadFile,
    showPicker,
    findFolderByName,
    createFolder,
    listFiles,
    downloadFileContent,
    searchFiles,
  }), [
    isDriveApiReady,
    isSignedIn,
    profile,
    handleAuthClick,
    handleSignoutClick,
    uploadFile,
    showPicker,
    findFolderByName,
    createFolder,
    listFiles,
    downloadFileContent,
    searchFiles,
  ]);
}
