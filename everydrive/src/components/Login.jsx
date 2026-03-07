import React, { useState } from 'react';
import { usePCloud } from '../hooks/usePCloud';
import { KeyRound, Mail, Cloud } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = usePCloud();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, pass);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="inline-flex p-4 rounded-3xl bg-accent-dim text-accent mb-6">
                        <Cloud size={40} />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white mb-2">every<span className="text-accent">Drive</span></h1>
                    <p className="text-slate-400">Connect your pCloud account to begin.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="pCloud Email"
                            className="w-full bg-surface-2/50 border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-accent/40 transition-all"
                        />
                    </div>

                    <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="password"
                            required
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            placeholder="pCloud Password"
                            className="w-full bg-surface-2/50 border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-accent/40 transition-all"
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center font-medium animate-pulse">{error}</p>}

                    <button
                        disabled={loading}
                        className="w-full bg-white text-bg font-bold py-4 rounded-2xl hover:bg-accent hover:text-bg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Connecting...' : 'Continue to everyDrive'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
