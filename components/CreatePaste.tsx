import React from 'react';
import { usePasteCreation } from '../hooks/usePasteCreation';
import { PasteSuccessView } from './CreatePaste/PasteSuccessView';
import { PasteEditorArea } from './CreatePaste/PasteEditorArea';
import { PasteOptionsBar } from './CreatePaste/PasteOptionsBar';

interface CreatePasteProps {
  initialData?: {
    content: string;
    language: string;
  } | null;
}

export const CreatePaste: React.FC<CreatePasteProps> = ({ initialData }) => {
  const {
    content, setContent,
    password, setPassword,
    isProcessing,
    burnAfterRead, setBurnAfterRead,
    expiration, setExpiration,
    language, setLanguage,
    shareUrl,
    error,
    showPassword, setShowPassword,
    handleEncrypt,
    handleReset,
    handleGeneratePassword
  } = usePasteCreation({ initialData });

  if (shareUrl) {
    return (
      <PasteSuccessView
        shareUrl={shareUrl}
        password={password}
        expiration={expiration}
        burnAfterRead={burnAfterRead}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] gap-4">
      <PasteEditorArea
        content={content}
        setContent={setContent}
        language={language}
      />

      <PasteOptionsBar
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        handleGeneratePassword={handleGeneratePassword}
        language={language}
        setLanguage={setLanguage}
        expiration={expiration}
        setExpiration={setExpiration}
        burnAfterRead={burnAfterRead}
        setBurnAfterRead={setBurnAfterRead}
        handleEncrypt={handleEncrypt}
        isProcessing={isProcessing}
        error={error}
        content={content}
      />
    </div>
  );
};
