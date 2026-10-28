'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { LogOut, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type Role = 'admin' | 'gerant' | 'caissier' | 'tailleur';

export interface Profil {
  id: string;
  email: string | null;
  nom: string | null;
  role: Role;
  actif: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  gerant: 'Gérant',
  caissier: 'Caissier / Vendeur',
  tailleur: 'Tailleur',
};

// Pages accessibles par profil
const ACCES: Record<Role, string[]> = {
  admin: [
    '/', '/ventes', '/clients', '/commandes', '/stock', '/catalogue',
    '/statistiques', '/utilisateurs', '/tailleurs'
  ],
  gerant: [
    '/', '/ventes', '/clients', '/commandes', '/stock', '/catalogue',
    '/statistiques', '/tailleurs'
  ],
  caissier: ['/ventes'],
  // Tailleur : uniquement Accueil + Clients + Statistiques
  tailleur: ['/', '/clients', '/statistiques'],
};

export const pageAccueil = (role: Role) =>
  role === 'caissier' ? '/ventes' : '/';

const peutAcceder = (role: Role, chemin: string) => {
  if (chemin === '/') return ACCES[role].includes('/');
  return ACCES[role].some((p) => p !== '/' && (chemin === p || chemin.startsWith(p + '/')));
};

interface AuthContextValue {
  session: Session | null;
  profil: Profil | null;
  role: Role | null;
  loading: boolean;
  refus: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profil: null,
  role: null,
  loading: true,
  refus: '',
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';

const EcranChargement = () => (
  <div style={{ minHeight: '100vh', backgroundColor: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
  </div>
);

// Bouton de session (en haut à droite de chaque page) : initiales, nom, profil, menu de déconnexion
function BoutonSession({ profil, onSignOut }: { profil: Profil; onSignOut: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const nomAffiche = profil.nom || profil.email || 'Utilisateur';
  const initiales =
    nomAffiche
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('') || 'U';

  return (
    <div className="print:hidden fixed top-3 right-4 z-40" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {ouvert && <div className="fixed inset-0" onClick={() => setOuvert(false)} />}

      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 cursor-pointer ring-1 ring-white/25 shadow-lg transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: NAVY, color: '#FFFFFF' }}
        title="Mon compte"
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ backgroundColor: GOLD, color: NAVY }}
        >
          {initiales}
        </span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-[11px] font-bold max-w-[140px] truncate">{nomAffiche}</span>
          <span className="block text-[10px] font-semibold" style={{ color: GOLD }}>{ROLE_LABELS[profil.role]}</span>
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${ouvert ? 'rotate-180' : ''}`}
          style={{ color: 'rgba(255,255,255,0.7)' }}
        />
      </button>

      {ouvert && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">{nomAffiche}</p>
            <p className="text-[11px] text-slate-500 truncate">{profil.email}</p>
            <span
              className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#FBF3E2', color: '#8A6A1E' }}
            >
              {ROLE_LABELS[profil.role]}
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <LogOut size={14} /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [sessionChargee, setSessionChargee] = useState(false);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [refus, setRefus] = useState('');

  const userId = session?.user?.id ?? null;

  // 1) Session Supabase (persistée dans le navigateur : chaque poste garde sa session)
  useEffect(() => {
    let actif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      setSession(data.session);
      setSessionChargee(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setSessionChargee(true);
    });
    return () => {
      actif = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2) Profil (rôle) de l'utilisateur connecté
  useEffect(() => {
    if (!sessionChargee) return;
    if (!userId) {
      setProfil(null);
      return;
    }
    let actif = true;
    supabase
      .from('profils')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!actif) return;
        if (error) {
          setRefus('Impossible de charger votre profil. Réessayez.');
          supabase.auth.signOut();
        } else if (!data) {
          setRefus("Ce compte n'a pas encore d'accès configuré. Contactez l'administrateur.");
          supabase.auth.signOut();
        } else if (data.actif === false) {
          setRefus('Ce compte est désactivé. Contactez l\'administrateur.');
          supabase.auth.signOut();
        } else {
          setRefus('');
          setProfil(data as Profil);
        }
      });
    return () => {
      actif = false;
    };
  }, [userId, sessionChargee]);

  const loading = !sessionChargee || (!!userId && profil?.id !== userId);

  // 3) Garde de navigation
  useEffect(() => {
    if (loading) return;
    if (!profil) {
      if (pathname !== '/login') router.replace('/login');
      return;
    }
    // On ne redirige plus silencieusement : on laisse le composant afficher "Accès Refusé"
    if (pathname === '/login') {
      router.replace(pageAccueil(profil.role));
    }
  }, [loading, profil, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfil(null);
    router.replace('/login');
  };

  const valeur: AuthContextValue = {
    session,
    profil,
    role: profil?.role ?? null,
    loading,
    refus,
    signOut,
  };

  const enLogin = pathname === '/login';
  let contenu: React.ReactNode;

  if (loading) {
    contenu = <EcranChargement />;
  } else if (!profil) {
    contenu = enLogin ? children : <EcranChargement />;
  } else if (enLogin) {
    contenu = <EcranChargement />;
  } else if (!peutAcceder(profil.role, pathname)) {
    contenu = (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: NAVY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '32px 40px',
            maxWidth: 420,
            width: '100%',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <p style={{ fontSize: 48, margin: '0 0 12px' }}>🚫</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: GOLD }}>
            Accès refusé
          </h1>
          <p style={{ fontSize: 14, opacity: 0.85, margin: '0 0 24px', lineHeight: 1.5 }}>
            Votre profil ({ROLE_LABELS[profil.role]}) n’a pas l’autorisation
            d’accéder à cette page.
          </p>
          <button
            onClick={() => router.replace(pageAccueil(profil.role))}
            style={{
              backgroundColor: GOLD,
              color: NAVY,
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Retour à l’accueil
          </button>
        </div>
        <BoutonSession profil={profil} onSignOut={signOut} />
      </div>
    );
  } else {
    contenu = (
      <>
        {children}
        <BoutonSession profil={profil} onSignOut={signOut} />
      </>
    );
  }

  return <AuthContext.Provider value={valeur}>{contenu}</AuthContext.Provider>;
}
