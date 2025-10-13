/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { createContext, FC, ReactNode, useContext } from 'react';
import { useGoogleDrive, UseGoogleDriveResults } from '../hooks/useGoogleDrive';

const GoogleDriveContext = createContext<UseGoogleDriveResults | undefined>(
  undefined,
);

export type GoogleDriveProviderProps = {
  children: ReactNode;
  apiKey?: string;
  clientId?: string;
};

export const GoogleDriveProvider: FC<GoogleDriveProviderProps> = ({
  apiKey,
  clientId,
  children,
}) => {
  const drive = useGoogleDrive({ apiKey, clientId });

  return (
    <GoogleDriveContext.Provider value={drive}>
      {children}
    </GoogleDriveContext.Provider>
  );
};

export const useGoogleDriveContext = () => {
  const context = useContext(GoogleDriveContext);
  if (!context) {
    throw new Error(
      'useGoogleDriveContext must be used within a GoogleDriveProvider',
    );
  }
  return context;
};