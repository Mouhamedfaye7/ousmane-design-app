'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, LogIn, Lock, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';
const ORANGE = '#C1502E';

export default function LoginPage() {
  const { refus } = useAuth();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (refus) setEnvoi(false);
  }, [refus]);

  const seConnecter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: motDePasse,
    });
    if (error) {
      const msg = error.message || '';
      setErreur(
        msg.includes('Invalid login credentials')
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : msg.includes('Email not confirmed')
            ? "Ce compte n'a pas été confirmé dans Supabase (case « Auto Confirm User »)."
            : `Connexion impossible : ${msg}`
      );
      setEnvoi(false);
    }
    // Succès : AuthProvider charge le profil et redirige vers la bonne page.
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: NAVY }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@500&family=Playfair+Display:ital,wght@1,900&display=swap');
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      `}</style>

      <div className="w-full max-w-sm font-body">
        <div className="text-center mb-8">
          <h1
            className="m-0 inline-block"
            style={{
              color: '#FFFFFF',
              fontSize: 'clamp(3rem, 13vw, 4.6rem)',
              fontFamily: "'Playfair Display', 'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 900,
            }}
          >
            <span className="block whitespace-nowrap" style={{ lineHeight: 0.8, letterSpacing: '-0.01em' }}>
              Ousmane
            </span>
            <span className="block whitespace-nowrap text-center" style={{ fontSize: '0.676em', lineHeight: 0.856 }}>
              Design
            </span>
            <span
              className="block whitespace-nowrap"
              style={{
                width: 0,
                minWidth: '100%',
                fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
                fontStyle: 'normal',
                fontWeight: 500,
                fontSize: 'max(9px, 0.146em)',
                lineHeight: 1,
                marginTop: '1.4em',
                letterSpacing: '0.2em',
                textAlign: 'justify',
                textAlignLast: 'justify',
                textTransform: 'uppercase',
                color: '#D9BE8C',
              }}
            >
              Création &amp; Couture Contemporaine
            </span>
          </h1>
        </div>

        <form onSubmit={seConnecter} className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: NAVY }}>
            Espace de gestion
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Adresse e-mail</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: NAVY, opacity: 0.5 }} />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-full bg-slate-50 outline-none focus:ring-2 focus:bg-white text-slate-900"
                style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: NAVY, opacity: 0.5 }} />
              <input
                type="password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-full bg-slate-50 outline-none focus:ring-2 focus:bg-white text-slate-900"
                style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
              />
            </div>
          </div>

          {(erreur || refus) && (
            <p className="text-xs font-semibold rounded-lg px-3 py-2" style={{ backgroundColor: '#FBEAE3', color: ORANGE }}>
              {erreur || refus}
            </p>
          )}

          <button
            type="submit"
            disabled={envoi}
            className="w-full py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            {envoi ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            Se connecter
          </button>

          <p className="text-[10px] text-slate-400 text-center">
            Mot de passe oublié ? Demandez à l'administrateur de le réinitialiser.
          </p>
        </form>
      </div>
    </div>
  );
}
