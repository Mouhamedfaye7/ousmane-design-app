'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Clock, CheckCircle2, TrendingUp, ShoppingBag, Scissors, Layers, BarChart3, Plus } from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({
    totalClients: 0,
    enCours: 0,
    pretes: 0,
    chiffreAffaires: 0,
  });

  useEffect(() => {
    // Calcul dynamique depuis localStorage
    const savedVentes = localStorage.getItem('ousmane_ventes');
    const savedCommandes = localStorage.getItem('ousmane_commandes');
    const savedClients = localStorage.getItem('ousmane_clients');

    let totalCA = 50000; // valeur par défaut
    let clientCount = 2;
    let countEnCours = 1;
    let countPretes = 0;

    if (savedVentes) {
      try {
        const ventes = JSON.parse(savedVentes);
        totalCA = ventes.reduce((sum: number, v: any) => sum + (Number(v.avance) || Number(v.total) || 0), 0);
      } catch (e) {}
    }

    if (savedClients) {
      try {
        const clients = JSON.parse(savedClients);
        clientCount = clients.length;
      } catch (e) {}
    }

    if (savedCommandes) {
      try {
        const commandes = JSON.parse(savedCommandes);
        countEnCours = commandes.filter((c: any) => c.statut === 'En cours').length;
        countPretes = commandes.filter((c: any) => c.statut === 'Prête').length;
      } catch (e) {}
    }

    setStats({
      totalClients: clientCount,
      enCours: countEnCours,
      pretes: countPretes,
      chiffreAffaires: totalCA,
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">OUSMANE DESIGN</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Tableau de bord — Haute Couture & Atelier Sur-Mesure</p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/ventes"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus size={16}/> Nouvelle Vente
          </Link>
          <Link 
            href="/commandes"
            className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus size={16}/> Nouvelle Commande
          </Link>
        </div>
      </div>

      {/* Cartes de Statistiques Dynamiques */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TOTAL CLIENTS</span>
            <span className="text-2xl font-black text-slate-900">{stats.totalClients}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">EN COURS EN ATELIER</span>
            <span className="text-2xl font-black text-amber-600">{stats.enCours}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">COMMANDES PRÊTES</span>
            <span className="text-2xl font-black text-emerald-600">{stats.pretes}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CHIFFRE D'AFFAIRES</span>
            <span className="text-2xl font-black text-slate-900">{stats.chiffreAffaires.toLocaleString()} F</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

      </div>

      {/* Modules de Gestion */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-base font-bold text-slate-900 mb-4">Modules de Gestion</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <Link href="/ventes" className="group bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Ventes & Caisse Directe</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Enregistrement des ventes boutique, encaissement Wave/Espèces et impression de tickets.</p>
            </div>
          </Link>

          <Link href="/clients" className="group bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Gestion des Clients</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Répertoire client, numéros WhatsApp et mesures personnelles.</p>
            </div>
          </Link>

          <Link href="/commandes" className="group bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-amber-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Scissors size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">Suivi d'Atelier & Commandes</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Kanban de production, statuts, notifications WhatsApp et reçus.</p>
            </div>
          </Link>

          <Link href="/stock" className="group bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-purple-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">Stock de Tissus</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Inventaire des tissus, suivi du métrage et valeur estimée.</p>
            </div>
          </Link>

          <Link href="/statistiques" className="group bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-800 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-slate-900 transition-colors">Statistiques & Revenus</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Suivi du chiffre d'affaires, acomptes encaissés et reste à recouvrir.</p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
