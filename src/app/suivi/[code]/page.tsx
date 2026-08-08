'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';

const STATUTS_ORDER = [
  { key: 'commande_recue', label: 'Commande reçue' },
  { key: 'en_coupe', label: 'En coupe' },
  { key: 'en_couture', label: 'En couture' },
  { key: 'essayage', label: 'Essayage' },
  { key: 'finition', label: 'Finition' },
  { key: 'prete', label: 'Prête' },
  { key: 'livree_payee', label: 'Livrée' },
];

export default function SuiviClientPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [commande, setCommande] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getCommande() {
      const { data } = await supabase
        .from('commandes')
        .select('*, clients(nom_complet)')
        .eq('code_suivi', code)
        .single();
      
      setCommande(data);
      setLoading(false);
    }
    getCommande();
  }, [code]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">Chargement du suivi...</div>;
  if (!commande) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-red-400 text-sm">Commande introuvable.</div>;

  const currentIdx = STATUTS_ORDER.findIndex(s => s.key === commande.statut);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <span className="text-xs font-mono bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
            {commande.code_suivi}
          </span>
          <h1 className="text-2xl font-bold text-white mt-3">Ousmane Design</h1>
          <p className="text-xs text-slate-400">Bonjour {commande.clients?.nom_complet || 'Cher client'}</p>
        </div>

        {/* Status Stepper */}
        <div className="space-y-4 my-6">
          {STATUTS_ORDER.map((s, idx) => {
            const isDone = idx <= currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  isCurrent ? 'bg-amber-500 text-slate-900 ring-4 ring-amber-500/20' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="flex-grow">
                  <p className={`text-sm font-medium ${isCurrent ? 'text-amber-400 font-bold' : isDone ? 'text-white' : 'text-slate-500'}`}>
                    {s.label}
                  </p>
                </div>
                {isCurrent && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded flex items-center">
                    <Clock className="w-3 h-3 mr-1 animate-spin" /> En cours
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Resume financier */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Total commande:</span>
            <span className="text-white font-semibold">{commande.prix_total.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Acompte versé:</span>
            <span className="text-emerald-400 font-semibold">{commande.acompte_verse.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
            <span>Solde restant:</span>
            <span className="text-amber-400 font-bold text-sm">{(commande.prix_total - commande.acompte_verse).toLocaleString()} FCFA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
