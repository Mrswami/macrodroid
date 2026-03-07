import React, { useState } from 'react';
import { useAuthStore } from '../store';
import { ShieldCheck, Lock } from 'lucide-react';

const Locker = () => {
    const [val, setVal] = useState('');
    const [error, setError] = useState(false);
    const { setPasscode } = useAuthStore();

    const handleUnlock = () => {
        const ENV_PASS = import.meta.env.VITE_APP_PASSCODE;
        if (val === ENV_PASS) {
            setPasscode(val);
        } else {
            setError(true);
            setVal('');
            setTimeout(() => setError(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 backdrop-blur-xl">
            <div className="w-full max-w-sm p-8 card-glass rounded-[32px] text-center space-y-6">
                <div className="inline-flex p-4 rounded-2xl bg-accent/10 text-accent mx-auto">
                    {error ? <Lock size={32} className="text-red-400 animate-bounce" /> : <ShieldCheck size={32} />}
                </div>

                <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1">Secure Locker</h2>
                    <p className="text-slate-400 text-sm">Passcode required to access your everyDrive.</p>
                </div>

                <div className="space-y-4">
                    <input
                        type="password"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                        placeholder="••••••"
                        className={`w-full bg-white/5 border-2 ${error ? 'border-red-500/50' : 'border-white/5'} rounded-2xl px-4 py-4 text-center text-3xl tracking-[1em] focus:outline-none focus:border-accent/40 transition-all`}
                        autoFocus
                    />

                    <button
                        onClick={handleUnlock}
                        className="w-full bg-accent text-bg font-bold py-4 rounded-2xl hover:bg-white hover:text-bg transition-all active:scale-95"
                    >
                        Unlock everyDrive
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Locker;
