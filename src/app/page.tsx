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
  BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [totalClients, setTotalClients] = useState<number>(0);
  const [enCoursCount, setEnCoursCount] = useState<number>(0);
  const [pretesCount, setPretesCount] = useState<number>(0);
  const [chiffreAffaires, setChiffreAffaires] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardStats() {
      setLoading(true);

      try {
        // 1. Récupérer le vrai nombre total de clients depuis la table 'clients'
        const { count: clientCount, error: clientError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        if (!clientError && clientCount !== null) {
          setTotalClients(clientCount);
        }

        // 2. Récupérer les commandes pour l'atelier
        const { data: commandes, error: cmdError } = await supabase
          .from('commandes')
          .select('*');

        let caCommandes = 0;
        let enCours = 0;
        let pretes = 0;

        if (!cmdError && commandes) {
          enCours = commandes.filter(
            c => !c.statut || c.statut === 'Reçue' || c.statut === 'En Coupe'
          ).length;

          pretes = commandes.filter(c => c.statut === 'Prête').length;

          caCommandes = commandes.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0);
        }

        setEnCoursCount(enCours);
        setPretesCount(pretes);

        // 3. Récupérer les ventes directes (si la table 'ventes' existe)
        const { data: ventes, error: ventError } = await supabase
          .from('ventes')
          .select('*');

        let caVentes = 0;
        if (!ventError && ventes) {
          caVentes = ventes.reduce((acc, v) => acc + (Number(v.montant_total) || Number(v.montant) || 0), 0);
        }

        // Chiffre d'affaires global cumulé (Commandes + Ventes)
        setChiffreAffaires(caCommandes + caVentes);

      } catch (err) {
        console.error("Erreur lors du chargement du tableau de bord :", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();

    // Écouteur temps réel pour synchroniser instantanément si des modifications ont lieu ailleurs
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

        {/* INDICATEURS DYNAMIQUES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Clients</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '...' : totalClients}
              </h2>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">En Cours Atelier</p>
              <h2 className="text-2xl font-bold text-amber-600 mt-1">
                {loading ? '...' : enCoursCount}
              </h2>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commandes Prêtes</p>
              <h2 className="text-2xl font-bold text-emerald-600 mt-1">
                {loading ? '...' : pretesCount}
              </h2>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '...' : `${formatAmount(chiffreAffaires)} F`}
              </h2>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp size={22} />
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
