import { Component, Switch, Match } from 'solid-js';
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

export const ViewPaste: Component<ViewPasteProps> = (props) => {
  const { status, decryptedPaste, errorMsg, submitPassword } = usePasteViewer(
    () => props.pasteId,
    () => props.decryptionKey
  );

  return (
    <Switch>
      <Match when={status() === 'loading' || status() === 'decrypting'}>
        <LoadingView status={status() as 'loading' | 'decrypting'} />
      </Match>
      <Match when={status() === 'password_required'}>
        <PasswordRequest
          onSubmit={submitPassword}
          pasteId={props.pasteId}
          errorMsg={errorMsg()}
          onBack={props.onBack}
        />
      </Match>
      <Match when={status() === 'error'}>
        <ErrorView errorMsg={errorMsg()} onBack={props.onBack} />
      </Match>
      <Match when={status() === 'success' && decryptedPaste()}>
        <PasteContent decryptedPaste={decryptedPaste()!} onFork={props.onFork} />
      </Match>
    </Switch>
  );
};
