import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as CryptoService from '../services/cryptoService';
import * as StorageService from '../services/storageService';
import { CreatePastePayload } from '../types';

interface UsePasteCreationProps {
    initialData?: {
        content: string;
        language: string;
    } | null;
}

export const usePasteCreation = ({ initialData }: UsePasteCreationProps = {}) => {
    const [content, setContent] = useState(initialData?.content || '');
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [burnAfterRead, setBurnAfterRead] = useState(false);
    const [expiration, setExpiration] = useState<number>(24 * 60 * 60 * 1000); // Default 1 Day
    const [language, setLanguage] = useState<string>(initialData?.language || 'plaintext');
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleGeneratePassword = useCallback(() => {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        const length = 17;
        const randomValues = new Uint32Array(length);
        window.crypto.getRandomValues(randomValues);

        let newPassword = "";
        for (let i = 0; i < length; i++) {
            newPassword += charset[randomValues[i] % charset.length];
        }
        setPassword(newPassword);
        setShowPassword(true);
    }, []);

    const handleReset = useCallback(() => {
        setShareUrl(null);
        setContent('');
        setPassword('');
        setBurnAfterRead(false);
        setExpiration(24 * 60 * 60 * 1000);
        setLanguage('plaintext');
        setError(null);
        setShowPassword(false);
    }, []);

    const handleEncrypt = useCallback(async () => {
        if (!content.trim()) return;

        setIsProcessing(true);
        setError(null);

        try {
            // 0. Solve PoW Challenge
            const challengeRes = await fetch('/api/v1/challenge');
            if (!challengeRes.ok) throw new Error("Failed to get PoW challenge");
            const challenge = await challengeRes.json();

            // Worker for PoW
            const nonce = await new Promise<string>((resolve, reject) => {
                const worker = new Worker(new URL('../workers/pow.worker.ts', import.meta.url), { type: 'module' });
                worker.onmessage = (e) => {
                    resolve(e.data);
                    worker.terminate();
                };
                worker.onerror = (e) => {
                    reject(e);
                    worker.terminate();
                };
                worker.postMessage({ salt: challenge.salt, difficulty: challenge.difficulty });
            });

            const powHeaders = {
                'X-PoW-Salt': challenge.salt,
                'X-PoW-Nonce': nonce,
                'X-PoW-Timestamp': challenge.timestamp.toString(),
                'X-PoW-Signature': challenge.signature
            };

            // 1. Generate Content Key
            const contentKey = await CryptoService.generateKey();

            // 1b. Generate Burn Token if needed
            let burnToken: string | undefined;
            let burnTokenHash: string | undefined;
            if (burnAfterRead) {
                burnToken = uuidv4();
                burnTokenHash = await CryptoService.hashToken(burnToken);
            }

            // 2. Encrypt Content (pack language inside to prevent metadata leakage)
            const payloadToEncrypt = JSON.stringify({
                text: content,
                language,
                burnToken
            });
            const { iv: contentIv, data: encryptedContent } = await CryptoService.encryptText(payloadToEncrypt, contentKey);

            // 3. Calculate Expiration
            const expiresAt = expiration > 0 ? Date.now() + expiration : undefined;

            // 4. Prepare payload (language is now inside ciphertext, not exposed to server)
            let payload: CreatePastePayload = {
                iv: contentIv,
                data: encryptedContent,
                createdAt: Date.now(),
                expiresAt,
                burnAfterRead,
                views: 0,
                hasPassword: false,
                burnTokenHash
            };

            let keyParam = '';

            if (password.trim()) {
                const salt = CryptoService.generateSalt();
                const wrapperKey = await CryptoService.deriveKeyFromPassword(password, salt);
                const contentKeyString = await CryptoService.exportKey(contentKey);
                const { iv: keyIv, data: encryptedKeyData } = await CryptoService.encryptText(contentKeyString, wrapperKey);

                payload.hasPassword = true;
                payload.salt = await CryptoService.arrayBufferToBase64(salt.buffer as ArrayBuffer);
                payload.encryptedKey = encryptedKeyData;
                payload.keyIv = keyIv;
                keyParam = '';
            } else {
                const keyString = await CryptoService.exportKeyRaw(contentKey);
                keyParam = `&key=${keyString}`;
            }

            // Check payload size (1.5MB limit)
            const payloadSize = new Blob([JSON.stringify(payload)]).size;
            if (payloadSize > 1.5 * 1024 * 1024) {
                throw new Error("Paste is too large (Limit: 1.5MB)");
            }

            const id = await StorageService.savePaste(payload, powHeaders);

            const origin = window.location.origin;
            const pathname = window.location.pathname || '/';
            const url = `${origin}${pathname}#view/${id}${keyParam}`;
            setShareUrl(url);

        } catch (error) {
            console.error("Encryption/Upload failed:", error);
            setError("Failed to create paste. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    }, [content, burnAfterRead, expiration, language, password]);

    return {
        content, setContent,
        password, setPassword,
        isProcessing,
        burnAfterRead, setBurnAfterRead,
        expiration, setExpiration,
        language, setLanguage,
        shareUrl, setShareUrl,
        error,
        showPassword, setShowPassword,
        handleEncrypt,
        handleReset,
        handleGeneratePassword
    };
};
