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
  PieChart
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
  acompte?: number;
  reste?: number;
  created_at?: string;
}

interface VenteRow {
  id?: string;
  mode_commande?: string;
  montant_total?: number;
  avance?: number;
  reste?: number;
}

export default function StatistiquesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [ventes, setVentes] = useState<VenteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatsData = async () => {
    setLoading(true);
    const [cmdRes, venteRes] = await Promise.all([
      supabase.from('commandes').select('*').order('created_at', { ascending: false }),
      supabase.from('ventes').select('*')
    ]);
    if (!cmdRes.error && cmdRes.data) setCommandes(cmdRes.data);
    if (!venteRes.error && venteRes.data) setVentes(venteRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

  const formatAmount = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  // Normalise les montants stockés en "milliers" (ex: 25 -> 25 000), même logique que la page Ventes
  const normalizeAmount = (val: number | undefined | null) => {
    let num = Number(val) || 0;
    if (num > 0 && num < 1000) num = num * 1000;
    return num;
  };

  // --- HELPER : CALCUL FINANCIER PRÉCIS (commandes sur-mesure) ---
  // 'Livrée' est le statut normal pour une commande payée/remise au client.
  // 'Soldée' est conservé ici en garde-fou pour d'éventuelles anciennes données
  // non migrées — mais le workflow normal ne produit plus ce statut.
  const getCalculatedFinancials = (c: Commande) => {
    const tot = Number(c.montant_total) || 0;
    let av = Number(c.avance ?? c.acompte) || 0;

    if (
      c.statut === 'Livrée' ||
      c.statut === 'Soldée' ||
      (c.reste !== undefined && Number(c.reste) === 0 && tot > 0)
    ) {
      av = tot;
    }

    const reste = c.reste !== undefined ? Math.max(0, Number(c.reste)) : Math.max(0, tot - av);
    return { tot, av, reste };
  };

  // Ventes boutique/catalogue NON liées à une commande sur-mesure soldée
  // (celles-ci sont déjà comptabilisées via la commande elle-même)
  const ventesBoutique = ventes.filter(v => !(v.mode_commande || '').startsWith('Sur Mesure'));

  const getVenteFinancials = (v: VenteRow) => {
    const tot = normalizeAmount(v.montant_total);
    const av = normalizeAmount(v.avance);
    const reste = v.reste !== undefined ? Math.max(0, normalizeAmount(v.reste)) : Math.max(0, tot - av);
    return { tot, av, reste };
  };

  // --- CALCULS DYNAMIQUES EN TEMPS RÉEL (combinés commandes + ventes boutique) ---
  const totalCommandes = commandes.length;
  const totalVentesBoutique = ventesBoutique.length;

  const caCommandes = commandes.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0);
  const caBoutique = ventesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).tot, 0);
  const caTotal = caCommandes + caBoutique;

  const avanceCommandes = commandes.reduce((acc, c) => acc + getCalculatedFinancials(c).av, 0);
  const avanceBoutique = ventesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).av, 0);
  const totalAvances = avanceCommandes + avanceBoutique;

  const resteCommandes = commandes.reduce((acc, c) => acc + getCalculatedFinancials(c).reste, 0);
  const resteBoutique = ventesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).reste, 0);
  const totalReste = resteCommandes + resteBoutique;

  // 'Soldée' compte comme livrée : la commande a été remise et payée intégralement.
  const nbRecues = commandes.filter(c => (c.statut || 'Reçue') === 'Reçue').length;
  const nbEnCoupe = commandes.filter(c => c.statut === 'En Coupe').length;
  const nbPretes = commandes.filter(c => c.statut === 'Prête').length;
  const nbLivrees = commandes.filter(c => c.statut === 'Livrée' || c.statut === 'Soldée').length;

  const pctLivrees = totalCommandes > 0 ? Math.round((nbLivrees / totalCommandes) * 100) : 0;
  const pctEnCours = totalCommandes > 0 ? Math.round(((nbRecues + nbEnCoupe + nbPretes) / totalCommandes) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2 font-semibold">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Rapport Statistique & Performance</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Analyse financière et suivi de la production</p>
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

      {/* KPI METRICS (INDICATEURS CLÉS) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Chiffre d'Affaires Total</p>
            <h2 className="text-xl font-bold text-slate-900">{formatAmount(caTotal)} FCFA</h2>
            <p className="text-xs text-slate-400 mt-1">{totalCommandes} commande(s) + {totalVentesBoutique} vente(s) boutique</p>
          </div>
          <div className="bg-amber-100 text-amber-700 p-3 rounded-lg">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Encaissements / Avances</p>
            <h2 className="text-xl font-bold text-emerald-600">{formatAmount(totalAvances)} FCFA</h2>
            <p className="text-xs text-emerald-600/80 mt-1 font-semibold">
              {caTotal > 0 ? Math.round((totalAvances / caTotal) * 100) : 0}% du total encaissé
            </p>
          </div>
          <div className="bg-emerald-100 text-emerald-700 p-3 rounded-lg">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reste à Recouvrer</p>
            <h2 className="text-xl font-bold text-rose-600">{formatAmount(totalReste)} FCFA</h2>
            <p className="text-xs text-rose-600/80 mt-1 font-semibold">Créances clients en attente</p>
          </div>
          <div className="bg-rose-100 text-rose-700 p-3 rounded-lg">
            <AlertCircle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Commandes Livrées</p>
            <h2 className="text-xl font-bold text-slate-900">{nbLivrees} / {totalCommandes}</h2>
            <p className="text-xs text-blue-600 mt-1 font-semibold">{pctLivrees}% de taux de finalisation</p>
          </div>
          <div className="bg-blue-100 text-blue-700 p-3 rounded-lg">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* SECTION RÉPARTITION PAR STATUT ET FINANCES */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* STATUT DE PRODUCTION */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <PieChart size={18} className="text-amber-600" /> État de la Production
            </h2>
            <span className="text-xs font-semibold text-slate-500">{totalCommandes} au total</span>
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

        {/* RÉCAPITULATIF FINANCIER DÉTAILLÉ */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-600" /> Bilan Financier de l'Atelier
              </h2>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Temps Réel
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Valeur globale (commandes + boutique)</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{formatAmount(caTotal)} F</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium">Total Perçu (Encaissements)</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">{formatAmount(totalAvances)} F</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-800 font-medium">Solde restant à encaisser</p>
                <p className="text-lg font-bold text-amber-800 mt-1">{formatAmount(totalReste)} F</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Taux de réalisation de l'Atelier (commandes sur-mesure) :</p>
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${pctLivrees}%` }} title={`Livrées: ${pctLivrees}%`}></div>
                <div className="bg-amber-400 h-full" style={{ width: `${pctEnCours}%` }} title={`En cours: ${pctEnCours}%`}></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Livrées ({pctLivrees}%)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> En cours de fabrication ({pctEnCours}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLEAU DES DERNIÈRES COMMANDES SYNCHRONISÉES */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Clock size={18} className="text-amber-600" /> Historique Dynamique des Commandes
          </h2>
          <span className="text-xs text-slate-400">{commandes.slice(0, 10).length} dernières entrées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="p-3">Code</th>
                <th className="p-3">Client</th>
                <th className="p-3">Article</th>
                <th className="p-3">Statut Fabrication</th>
                <th className="p-3 text-right">Montant Total</th>
                <th className="p-3 text-right">Réglé / Avance</th>
                <th className="p-3 text-right">Reste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">Chargement des statistiques...</td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">Aucune commande enregistrée pour le moment.</td>
                </tr>
              ) : (
                commandes.slice(0, 10).map((c) => {
                  const { tot, av, reste } = getCalculatedFinancials(c);

                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-300";
                  if (c.statut === 'En Coupe') badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
                  if (c.statut === 'Prête') badgeColor = "bg-blue-100 text-blue-800 border-blue-300";
                  if (c.statut === 'Livrée' || c.statut === 'Soldée') badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-semibold text-slate-700">{c.code_commande || '-'}</td>
                      <td className="p-3 font-bold text-slate-900">{c.client_nom || 'Anonyme'}</td>
                      <td className="p-3 text-slate-600">{c.designation || 'Commande sur mesure'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badgeColor}`}>
                          {c.statut || 'Reçue'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatAmount(tot)} F</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{formatAmount(av)} F</td>
                      <td className="p-3 text-right font-bold text-amber-700">{formatAmount(reste)} F</td>
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
