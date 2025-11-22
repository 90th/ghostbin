self.onmessage = async (e: MessageEvent) => {
    const { salt, difficulty } = e.data;
    const encoder = new TextEncoder();
    let nonce = 0;

    while (true) {
        const nonceStr = nonce.toString();
        const data = encoder.encode(salt + nonceStr);

        const hashBuffer = await self.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex.startsWith('0'.repeat(difficulty))) {
            self.postMessage(nonceStr);
            return;
        }

        nonce++;
    }
};
