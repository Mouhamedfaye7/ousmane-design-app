'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  PieChart,
  Receipt
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Commande {
  id?: string;
  code_commande?: string;
  client_nom?: string;
  statut?: string;
  designation?: string;
  montant_total?: number;
  avance?: number;
  reste?: number;
  created_at?: string;
}

interface Vente {
  id?: string;
  client_nom?: string;
  client_tel?: string;
  designation?: string;
  article?: string;
  description?: string;
  modele?: string;
  mode_commande?: string;
  mode_paiement?: string;
  montant_total?: number;
  avance?: number;
  reste?: number;
  created_at?: string;
}

interface UnifiedItem {
  id: string;
  type: 'Commande' | 'Vente';
  codeOrLabel: string;
  client: string;
  designation: string;
  statutOrPayment: string;
  montant_total: number;
  avance: number;
  reste: number;
  created_at: string;
}

export default function StatistiquesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatsData = async () => {
    setLoading(true);
    
    // Chargement parallèle des commandes et des ventes
    const [resCommandes, resVentes] = await Promise.all([
      supabase.from('commandes').select('*').order('created_at', { ascending: false }),
      supabase.from('ventes').select('*').order('created_at', { ascending: false })
    ]);

    if (!resCommandes.error && resCommandes.data) {
      setCommandes(resCommandes.data);
    }
    if (!resVentes.error && resVentes.data) {
      setVentes(resVentes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

  const formatAmount = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  const getItemNameVente = (v: Vente) => {
    return v.designation || v.article || v.description || v.modele || 'Article direct';
  };

  // --- CALCULS COMMANDES ---
  const caCommandes = commandes.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0);
  const avancesCommandes = commandes.reduce((acc, c) => acc + (Number(c.avance) || 0), 0);
  const resteCommandes = commandes.reduce((acc, c) => {
    const tot = Number(c.montant_total) || 0;
    const av = Number(c.avance) || 0;
    const r = c.reste !== undefined && c.reste !== null ? Number(c.reste) : (tot - av);
    return acc + Math.max(0, r);
  }, 0);

  // --- CALCULS VENTES ---
  const caVentes = ventes.reduce((acc, v) => acc + (Number(v.montant_total) || 0), 0);
  const avancesVentes = ventes.reduce((acc, v) => acc + (Number(v.avance) || 0), 0);
  const resteVentes = ventes.reduce((acc, v) => {
    const tot = Number(v.montant_total) || 0;
    const av = Number(v.avance) || 0;
    const r = v.reste !== undefined && v.reste !== null ? Number(v.reste) : (tot - av);
    return acc + Math.max(0, r);
  }, 0);

  // --- TOTALISATIONS COMBINÉES ---
  const caTotal = caCommandes + caVentes;
  const totalAvances = avancesCommandes + avancesVentes;
  const totalReste = resteCommandes + resteVentes;
  const totalTransactions = commandes.length + ventes.length;

  // Statuts de production (Spécifique aux commandes)
  const totalCommandes = commandes.length;
  const nbRecues = commandes.filter(c => (c.statut || 'Reçue') === 'Reçue').length;
  const nbEnCoupe = commandes.filter(c => c.statut === 'En Coupe').length;
  const nbPretes = commandes.filter(c => c.statut === 'Prête').length;
  const nbLivrees = commandes.filter(c => c.statut === 'Livrée').length;

  const pctLivrees = totalCommandes > 0 ? Math.round((nbLivrees / totalCommandes) * 100) : 0;
  const pctEnCours = totalCommandes > 0 ? Math.round(((nbRecues + nbEnCoupe + nbPretes) / totalCommandes) * 100) : 0;

  // --- COMPILATION CHRONOLOGIQUE DES ACTIVITÉS RÉCENTES ---
  const unifiedHistory: UnifiedItem[] = [
    ...commandes.map(c => {
      const tot = Number(c.montant_total) || 0;
      const av = Number(c.avance) || 0;
      return {
        id: c.id || `cmd-${Math.random()}`,
        type: 'Commande' as const,
        codeOrLabel: c.code_commande || 'CMD',
        client: c.client_nom || 'Anonyme',
        designation: c.designation || 'Commande sur mesure',
        statutOrPayment: c.statut || 'Reçue',
        montant_total: tot,
        avance: av,
        reste: c.reste !== undefined && c.reste !== null ? Number(c.reste) : (tot - av),
        created_at: c.created_at || new Date().toISOString()
      };
    }),
    ...ventes.map(v => {
      const tot = Number(v.montant_total) || 0;
      const av = Number(v.avance) || 0;
      return {
        id: v.id || `vte-${Math.random()}`,
        type: 'Vente' as const,
        codeOrLabel: 'FACT-VENTE',
        client: v.client_nom || 'Client direct',
        designation: getItemNameVente(v),
        statutOrPayment: v.mode_paiement || 'Espèces',
        montant_total: tot,
        avance: av,
        reste: v.reste !== undefined && v.reste !== null ? Number(v.reste) : (tot - av),
        created_at: v.created_at || new Date().toISOString()
      };
    })
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Rapport Statistique & Performance</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Analyse consolidée (Sur mesure & Ventes)</p>
        </div>

        <button
          onClick={fetchStatsData}
          disabled={loading}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer self-start md:self-auto text-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Actualiser les données</span>
        </button>
      </div>

      {/* KPI METRICS (INDICATEURS CLÉS GLOBAL) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Chiffre d'Affaires Global</p>
            <h2 className="text-xl font-bold text-slate-900">{formatAmount(caTotal)} FCFA</h2>
            <p className="text-xs text-slate-400 mt-1">{totalTransactions} transaction(s) au total</p>
          </div>
          <div className="bg-amber-100 text-amber-700 p-3 rounded-lg">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Encaissé (Avances)</p>
            <h2 className="text-xl font-bold text-emerald-600">{formatAmount(totalAvances)} FCFA</h2>
            <p className="text-xs text-emerald-600/80 mt-1">
              {caTotal > 0 ? Math.round((totalAvances / caTotal) * 100) : 0}% du CA recouvré
            </p>
          </div>
          <div className="bg-emerald-100 text-emerald-700 p-3 rounded-lg">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Créances Restantes</p>
            <h2 className="text-xl font-bold text-rose-600">{formatAmount(totalReste)} FCFA</h2>
            <p className="text-xs text-rose-600/80 mt-1">Solde à percevoir</p>
          </div>
          <div className="bg-rose-100 text-rose-700 p-3 rounded-lg">
            <AlertCircle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ventes Directes</p>
            <h2 className="text-xl font-bold text-slate-900">{formatAmount(caVentes)} FCFA</h2>
            <p className="text-xs text-blue-600 mt-1">{ventes.length} facture(s) enregistrée(s)</p>
          </div>
          <div className="bg-blue-100 text-blue-700 p-3 rounded-lg">
            <Receipt size={22} />
          </div>
        </div>
      </div>

      {/* SECTION VENTILATION DE LA PERFORMANCE */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* REPARTITION DES ATELIERS & STATUTS DE PRODUCTION */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <PieChart size={18} className="text-amber-600" /> Suivi de Fabrication (Atelier)
            </h2>
            <span className="text-xs font-semibold text-slate-500">{totalCommandes} commande(s)</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-slate-600">Reçues ({nbRecues})</span>
                <span className="text-slate-800">{totalCommandes > 0 ? Math.round((nbRecues/totalCommandes)*100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${totalCommandes > 0 ? (nbRecues/totalCommandes)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-amber-700">En Coupe ({nbEnCoupe})</span>
                <span className="text-amber-700">{totalCommandes > 0 ? Math.round((nbEnCoupe/totalCommandes)*100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalCommandes > 0 ? (nbEnCoupe/totalCommandes)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-blue-700">Prêtes ({nbPretes})</span>
                <span className="text-blue-700">{totalCommandes > 0 ? Math.round((nbPretes/totalCommandes)*100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalCommandes > 0 ? (nbPretes/totalCommandes)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-emerald-700">Livrées ({nbLivrees})</span>
                <span className="text-emerald-700">{totalCommandes > 0 ? Math.round((nbLivrees/totalCommandes)*100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalCommandes > 0 ? (nbLivrees/totalCommandes)*100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* COMPARAISON SUR MESURE VS VENTES DIRECTES */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-600" /> Ventilation des Revenus
              </h2>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Temps Réel Synchro
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Sur Mesure (Commandes)</span>
                  <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">{commandes.length}</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{formatAmount(caCommandes)} F</p>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>Encaissé: <strong className="text-emerald-600">{formatAmount(avancesCommandes)} F</strong></span>
                  <span>Reste: <strong className="text-rose-600">{formatAmount(resteCommandes)} F</strong></span>
                </div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">Ventes Directes (Magasin)</span>
                  <span className="text-[11px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">{ventes.length}</span>
                </div>
                <p className="text-xl font-bold text-amber-900">{formatAmount(caVentes)} F</p>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-amber-200/60">
                  <span>Encaissé: <strong className="text-emerald-600">{formatAmount(avancesVentes)} F</strong></span>
                  <span>Reste: <strong className="text-amber-700">{formatAmount(resteVentes)} F</strong></span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Part du Chiffre d'Affaires par activité :</p>
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
                <div 
                  className="bg-slate-800 h-full" 
                  style={{ width: `${caTotal > 0 ? Math.round((caCommandes / caTotal) * 100) : 0}%` }} 
                  title={`Commandes: ${caTotal > 0 ? Math.round((caCommandes / caTotal) * 100) : 0}%`}
                ></div>
                <div 
                  className="bg-amber-500 h-full" 
                  style={{ width: `${caTotal > 0 ? Math.round((caVentes / caTotal) * 100) : 0}%` }} 
                  title={`Ventes Directes: ${caTotal > 0 ? Math.round((caVentes / caTotal) * 100) : 0}%`}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block"></span> 
                  Commandes sur mesure ({caTotal > 0 ? Math.round((caCommandes / caTotal) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> 
                  Ventes Directes ({caTotal > 0 ? Math.round((caVentes / caTotal) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* HISTORIQUE CONSOLIDÉ TEMPS RÉEL (COMMANDES & VENTES) */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Clock size={18} className="text-amber-600" /> Flux d'Activité Récent (Commandes & Ventes Directes)
          </h2>
          <span className="text-xs text-slate-400">{unifiedHistory.slice(0, 10).length} sur {unifiedHistory.length} opérations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="p-3">Type</th>
                <th className="p-3">Réf / Code</th>
                <th className="p-3">Client</th>
                <th className="p-3">Désignation</th>
                <th className="p-3">Statut / Paiement</th>
                <th className="p-3 text-right">Montant Total</th>
                <th className="p-3 text-right">Avance</th>
                <th className="p-3 text-right">Reste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400">Chargement des données unifiées...</td>
                </tr>
              ) : unifiedHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400">Aucune activité enregistrée.</td>
                </tr>
              ) : (
                unifiedHistory.slice(0, 12).map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          item.type === 'Commande' 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-700">{item.codeOrLabel}</td>
                      <td className="p-3 font-bold text-slate-900">{item.client}</td>
                      <td className="p-3 text-slate-600">{item.designation}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.statutOrPayment}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatAmount(item.montant_total)} F</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{formatAmount(item.avance)} F</td>
                      <td className="p-3 text-right font-bold text-amber-700">{formatAmount(item.reste)} F</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
