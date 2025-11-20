import React from 'react';
import { Shield, Database, Lock, HelpCircle, Heart, Server } from 'lucide-react';

export const AboutPage: React.FC = () => {
    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-3xl font-bold text-gray-100 tracking-tight">About Ghostbin</h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    A secure, ephemeral, and zero-knowledge pastebin service designed for privacy.
                </p>
            </div>

            {/* Philosophy & Security */}
            <div className="bg-surface border border-white/5 rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-5 h-5 text-brand-500" />
                    <h2 className="text-lg font-bold text-gray-200">Philosophy & Security</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-brand-400" /> Zero-Knowledge
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Ghostbin is a <strong>zero-knowledge</strong> service. The server sees only encrypted ciphertext and metadata. We cannot read your pastes even if we wanted to.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <Database className="w-4 h-4 text-brand-400" /> Ephemerality
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            All paste data is held <strong>in-memory</strong> by the Redis database. When the backend server restarts or the TTL expires, the data is <strong>permanently destroyed</strong>.
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <h3 className="text-sm font-bold text-gray-300 mb-2">Security Specifications</h3>
                    <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 font-mono">
                        <li><span className="text-brand-400">AES-256-GCM</span> for content encryption</li>
                        <li><span className="text-brand-400">Argon2id</span> (via WASM) for key derivation</li>
                        <li>Client-side encryption only</li>
                    </ul>
                </div>
            </div>

            {/* OpSec & Infrastructure */}
            <div className="bg-surface border border-white/5 rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <Server className="w-5 h-5 text-brand-500" />
                    <h2 className="text-lg font-bold text-gray-200">OpSec & Infrastructure</h2>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-gray-300">Volatile Storage</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            The backend utilizes Redis purely as an <strong>in-memory store</strong>. This ensures high performance and guarantees that data lives only in RAM.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-gray-300">No Disk Persistence</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            <strong>No data is ever written to the hard drive.</strong> We deliberately avoid database persistence mechanisms (like RDB or AOF) to ensure that forensic recovery is impossible once data is deleted from RAM.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-gray-300">The "Kill Switch" Effect</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Because of this architecture, a server restart, power loss, or process termination results in the <strong>immediate and permanent destruction</strong> of all active pastes. This is an intentional security feature, not a limitation.
                        </p>
                    </div>
                </div>
            </div>

            {/* FAQ */}
            <div className="bg-surface border border-white/5 rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <HelpCircle className="w-5 h-5 text-brand-500" />
                    <h2 className="text-lg font-bold text-gray-200">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-gray-300">Q: I set 'Never' for my paste, but it doesn't exist anymore. Why?</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            The backend server most likely restarted. All pastes are held in RAM for operational speed, meaning any server restart or crash will cause the data to be lost, regardless of the 'Never' setting.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-gray-300">Q: Is Ghostbin really Zero-Knowledge?</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Yes. The decryption key is never sent to the server. It is either included in the URL fragment (<code className="bg-black/30 px-1 rounded text-xs">#key=...</code>) or secured locally by your master password and Argon2id.
                        </p>
                    </div>
                </div>
            </div>

            {/* Donation */}
            <div className="text-center space-y-2 pt-8 pb-4">
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Support Us</span>
                </div>
                <p className="text-sm text-gray-500">Donate to support Ghostbin's operational costs.</p>
                <div className="flex flex-col items-center gap-2 mt-2">
                    <span className="text-xs font-mono text-gray-500">XMR Address</span>
                    <div className="bg-black/20 border border-white/5 rounded px-3 py-2 max-w-full break-all">
                        <code className="text-xs font-mono text-gray-400 select-all">
                            45BGfFwbvYtJrosc4xMR5MMG9Fz2pJosjeWNFRSJdQhdSkugjhFttj3Qs1XiHFUg9YDvZaYke7ZyRAiHa7oa5WjLGLZemvk
                        </code>
                    </div>
                </div>
            </div>

        </div>
    );
};
