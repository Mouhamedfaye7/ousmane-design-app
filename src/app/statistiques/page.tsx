'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, TrendingUp, DollarSign, PieChart, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function StatistiquesPage() {
  const [commandes, setCommandes] = useState<any[]>([]);

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    const { data } = await supabase.from('commandes').select('*');
    if (data) setCommandes(data);
  };

  const chiffrEAffairesTotal = commandes.reduce((acc, c) => acc + (c.prix_total || 0), 0);
  const acomptesEncaisss = commandes.reduce((acc, c) => acc + (c.acompte || 0), 0);
  const resteARecouvrer = chiffrEAffairesTotal - acomptesEncaisss;
  const commandesLivrees = commandes.filter(c => c.statut === 'Livrée').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour au tableau de bord
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Rapports & Statistiques Financières</h1>
        <p className="text-slate-500 text-sm">Ousmane Design — Vision globale des revenus et des acomptes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Chiffre d'Affaires Global</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{chiffrEAffairesTotal.toLocaleString()} F</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Acomptes Déjà Encaissés</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{acomptesEncaisss.toLocaleString()} F</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 uppercase">Reste à Recouvrer</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{resteARecouvrer.toLocaleString()} F</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase">Commandes Total</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-2">{commandes.length} ({commandesLivrees} livrées)</p>
        </div>
      </div>
    </div>
  );
}
