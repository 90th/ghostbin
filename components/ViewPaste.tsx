import React from 'react';
import { usePasteViewer } from '../hooks/usePasteViewer';
import { PasswordRequest } from './ViewPaste/PasswordRequest';
import { PasteContent } from './ViewPaste/PasteContent';
import { LoadingView, ErrorView } from './ViewPaste/StatusViews';

interface ViewPasteProps {
  pasteId: string;
  decryptionKey: string | null;
  onBack: () => void;
  onFork: (content: string, language: string) => void;
}

export const ViewPaste: React.FC<ViewPasteProps> = ({ pasteId, decryptionKey, onBack, onFork }) => {
  const { status, decryptedPaste, errorMsg, submitPassword } = usePasteViewer(pasteId, decryptionKey);

  if (status === 'loading' || status === 'decrypting') {
    return <LoadingView status={status} />;
  }

  if (status === 'password_required') {
    return (
      <PasswordRequest
        onSubmit={submitPassword}
        pasteId={pasteId}
        errorMsg={errorMsg}
        onBack={onBack}
      />
    );
  }

  if (status === 'error') {
    return <ErrorView errorMsg={errorMsg} onBack={onBack} />;
  }

  if (status === 'success' && decryptedPaste) {
    return <PasteContent decryptedPaste={decryptedPaste} onFork={onFork} />;
  }

  return null;
};
