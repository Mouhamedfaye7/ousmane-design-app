'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  ShoppingBag,
  Scissors,
  Layers,
  BookOpen,
  BarChart3,
  DollarSign,
  AlertCircle
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

export default function Dashboard() {
  const [totalClients, setTotalClients] = useState<number>(0);
  const [enCoursCount, setEnCoursCount] = useState<number>(0);
  const [pretesCount, setPretesCount] = useState<number>(0);
  const [chiffreAffaires, setChiffreAffaires] = useState<number>(0);
  const [totalAvances, setTotalAvances] = useState<number>(0);
  const [totalReste, setTotalReste] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper : Alignement strict avec la page statistiques pour le calcul des finances
  const getCalculatedFinancials = (c: Commande) => {
    const tot = Number(c.montant_total) || 0;
    let av = Number(c.avance) || 0;

    if (c.statut === 'Livrée') {
      av = tot; // Une commande livrée est totalement réglée
    }

    const reste = Math.max(0, tot - av);
    return { tot, av, reste };
  };

  useEffect(() => {
    async function loadDashboardStats() {
      setLoading(true);

      const { data: commandes, error } = await supabase
        .from('commandes')
        .select('*');

      if (!error && commandes) {
        // Total des clients uniques
        const clientsUniques = new Set(
          commandes.map(c => (c.client_nom || '').trim().toLowerCase()).filter(Boolean)
        );
        setTotalClients(clientsUniques.size);

        // Commandes en cours atelier (Reçue / En Coupe)
        const enCours = commandes.filter(
          c => !c.statut || c.statut === 'Reçue' || c.statut === 'En Coupe'
        ).length;
        setEnCoursCount(enCours);

        // Commandes prêtes
        const pretes = commandes.filter(c => c.statut === 'Prête').length;
        setPretesCount(pretes);

        // Chiffre d'affaires global
        const caTotal = commandes.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0);
        setChiffreAffaires(caTotal);

        // Cumul des Avances / Encaissements réels
        const avancesTotales = commandes.reduce((acc, c) => {
          const { av } = getCalculatedFinancials(c);
          return acc + av;
        }, 0);
        setTotalAvances(avancesTotales);

        // Cumul des Solde / Créances clients
        const resteTotal = commandes.reduce((acc, c) => {
          const { reste } = getCalculatedFinancials(c);
          return acc + reste;
        }, 0);
        setTotalReste(resteTotal);
      }

      setLoading(false);
    }

    loadDashboardStats();
  }, []);

  const formatAmount = (val: number) => {
    return val.toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-amber-900 tracking-tight">OUSMANE DESIGN</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Tableau de bord — <span className="text-amber-700 font-semibold">Création & Couture Contemporaine</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ventes"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer text-sm"
            >
              <Plus size={18} /> Nouvelle Vente
            </Link>
            <Link
              href="/clients"
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer text-sm"
            >
              <Plus size={18} /> Nouvelle Commande
            </Link>
          </div>
        </div>

        {/* INDICATEURS DYNAMIQUES SYNCHRONISÉS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Total Clients */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Clients</p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {loading ? '...' : totalClients}
              </h2>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={20} />
            </div>
          </div>

          {/* En Cours Atelier */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">En Cours</p>
              <h2 className="text-xl font-bold text-amber-600 mt-1">
                {loading ? '...' : enCoursCount}
              </h2>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={20} />
            </div>
          </div>

          {/* Commandes Prêtes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prêtes</p>
              <h2 className="text-xl font-bold text-emerald-600 mt-1">
                {loading ? '...' : pretesCount}
              </h2>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
          </div>

          {/* Chiffre d'Affaires */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CA Total</p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {loading ? '...' : `${formatAmount(chiffreAffaires)} F`}
              </h2>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>

          {/* Avances Perçues */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Encaissé</p>
              <h2 className="text-xl font-bold text-emerald-600 mt-1">
                {loading ? '...' : `${formatAmount(totalAvances)} F`}
              </h2>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={20} />
            </div>
          </div>

          {/* Reste à Recouvrer */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reste à Recouvrer</p>
              <h2 className="text-xl font-bold text-rose-600 mt-1">
                {loading ? '...' : `${formatAmount(totalReste)} F`}
              </h2>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={20} />
            </div>
          </div>

        </div>

        {/* MODULES DE GESTION */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800">Modules de Gestion</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Link href="/ventes" className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex items-start gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">Ventes & Caisse Directe</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Enregistrement des ventes boutique, encaissement Wave/Espèces et impression de tickets.
                </p>
              </div>
            </Link>

            <Link href="/clients" className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">Gestion des Clients</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Répertoire client, numéros WhatsApp et carnet de mesures personnalisées.
                </p>
              </div>
            </Link>

            <Link href="/commandes" className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex items-start gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                <Scissors size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-600 transition-colors">Suivi d'Atelier & Commandes</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Kanban de production, statuts de fabrication et notifications clients.
                </p>
              </div>
            </Link>

            <Link href="/stock" className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex items-start gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                <Layers size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">Stock de Tissus</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Inventaire des étoffes (Gezner, Bazin, Soie), métrage disponible et valeur estimée.
                </p>
              </div>
            </Link>

            <Link href="/catalogue" className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-rose-600 transition-colors">Catalogue & Modèles</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Galerie des modèles de l'atelier, grille tarifaire indicative et book photo pour les clients.
                </p>
              </div>
            </Link>

            <Link href="/statistiques" className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex items-start gap-4">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-slate-800 transition-colors">Statistiques & Revenus</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Suivi des acomptes, chiffre d'affaires global et reste à recouvrer auprès des clients.
                </p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
