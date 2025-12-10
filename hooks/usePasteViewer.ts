import { useState, useEffect, useCallback } from 'react';
import * as CryptoService from '../services/cryptoService';
import * as StorageService from '../services/storageService';
import { DecryptedPaste, EncryptedPaste } from '../types';
import { isValidLanguage } from '../lib/constants';

export type ViewerStatus = 'loading' | 'error' | 'password_required' | 'decrypting' | 'success';

export const usePasteViewer = (pasteId: string, decryptionKey: string | null) => {
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [pasteData, setPasteData] = useState<EncryptedPaste | null>(null);
  const [decryptedPaste, setDecryptedPaste] = useState<DecryptedPaste | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const decryptContent = useCallback(async (data: EncryptedPaste, keyString: string, isPasswordDerived = false) => {
    setStatus('decrypting');
    try {
      let contentKey: CryptoKey;

      if (isPasswordDerived) {
        if (!data.salt || !data.encryptedKey || !data.keyIv) {
          throw new Error("Corrupt password data.");
        }
        const salt = new Uint8Array(CryptoService.base64ToArrayBuffer(data.salt));
        const wrapperKey = await CryptoService.deriveKeyFromPassword(keyString, salt);
        const decryptedKeyJson = await CryptoService.decryptText(data.encryptedKey, data.keyIv, wrapperKey);
        contentKey = await CryptoService.importKey(decryptedKeyJson);
      } else {
        contentKey = await CryptoService.importKeyRaw(keyString);
      }

      const rawDecrypted = await CryptoService.decryptText(data.data, data.iv, contentKey);

      // parse payload to extract text, language, and burn token
      let text = rawDecrypted;
      let burnToken: string | undefined;
      let language: string = 'plaintext';

      try {
        const payload = JSON.parse(rawDecrypted);
        if (payload && typeof payload === 'object' && 'text' in payload) {
          text = payload.text;
          burnToken = payload.burnToken;
          // validate language against allowlist to prevent dom injection via class name
          if (payload.language && isValidLanguage(payload.language)) {
            language = payload.language;
          }
        }
      } catch (e) {
        // If JSON parse fails, assume it's just raw text
      }

      setDecryptedPaste({
        id: data.id,
        text,
        createdAt: data.createdAt,
        burnAfterRead: data.burnAfterRead,
        views: data.views,
        expiresAt: data.expiresAt,
        language,
        burnToken
      });
      setStatus('success');

      // If Burn After Read, delete now that we have successfully decrypted
      // We pass the burnToken to prove we decrypted it
      if (data.burnAfterRead) {
        StorageService.deletePaste(data.id, burnToken).catch(console.error);
      }

    } catch (err: any) {
      if (isPasswordDerived) {
        setStatus('password_required');
        setErrorMsg("Incorrect password.");
      } else {
        setStatus('error');
        setErrorMsg("Decryption failed. Key invalid.");
      }
    }
  }, []);

  useEffect(() => {
    const fetchPaste = async () => {
      try {
        // fetch metadata first to check if password is required without downloading full payload
        const metadata = await StorageService.getPasteMetadata(pasteId);
        if (!metadata || !metadata.exists) {
          throw new Error("Paste not found, expired, or burned.");
        }

        // if password required, prompt user before fetching full encrypted content
        if (metadata.hasPassword) {
          setStatus('password_required');
          return;
        }

        // no password needed, fetch full paste and decrypt
        if (!decryptionKey) {
          throw new Error("Decryption key missing.");
        }

        const encryptedData = await StorageService.getPaste(pasteId);
        if (!encryptedData) {
          throw new Error("Paste not found, expired, or burned.");
        }

        setPasteData(encryptedData);
        decryptContent(encryptedData, decryptionKey);

      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setErrorMsg(err.message || "Failed to load paste.");
      }
    };

    fetchPaste();
  }, [pasteId, decryptionKey, decryptContent]);

  const submitPassword = async (password: string) => {
    setStatus('loading');
    setErrorMsg('');

    try {
      let encryptedData = pasteData;

      if (!encryptedData) {
        // fetch full paste only after password is provided
        encryptedData = await StorageService.getPaste(pasteId);
        if (!encryptedData) {
          throw new Error("Paste not found, expired, or burned.");
        }
        setPasteData(encryptedData);
      }

      await decryptContent(encryptedData, password, true);
    } catch (err: any) {
      setStatus('password_required');
      setErrorMsg(err.message || "Failed to load paste.");
    }
  };

  return {
    status,
    decryptedPaste,
    errorMsg,
    submitPassword
  };
};
