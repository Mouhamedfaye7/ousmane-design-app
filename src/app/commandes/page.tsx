'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Trash2, 
  Send, 
  X,
  CheckCircle2,
  Clock,
  Scissors,
  PackageCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Commande {
  id: string;
  code_commande?: string;
  client_nom?: string;
  telephone?: string;
  designation?: string;
  montant_total?: number;
  avance?: number;
  statut?: string;
  created_at?: string;
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  
  // Modal Nouvelle Commande
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form, setForm] = useState({
    client_nom: '',
    telephone: '',
    designation: '',
    montant_total: '',
    avance: '',
    statut: 'Reçue'
  });

  const fetchCommandes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('commandes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCommandes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommandes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_nom || !form.designation) return;

    const code = `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
    const montant = parseFloat(form.montant_total) || 0;
    const avance = parseFloat(form.avance) || 0;

    const { error } = await supabase.from('commandes').insert([
      {
        code_commande: code,
        client_nom: form.client_nom,
        telephone: form.telephone,
        designation: form.designation,
        montant_total: montant,
        avance: avance,
        statut: form.statut
      }
    ]);

    if (!error) {
      setIsModalOpen(false);
      setForm({ client_nom: '', telephone: '', designation: '', montant_total: '', avance: '', statut: 'Reçue' });
      fetchCommandes();
    }
  };

  const updateStatut = async (id: string, newStatut: string) => {
    const { error } = await supabase
      .from('commandes')
      .update({ statut: newStatut })
      .eq('id', id);

    if (!error) {
      fetchCommandes();
    }
  };

  const deleteCommande = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette commande ?')) {
      const { error } = await supabase.from('commandes').delete().eq('id', id);
      if (!error) {
        fetchCommandes();
      }
    }
  };

  const formatAmount = (val: number) => {
    return val.toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  const filteredCommandes = commandes.filter(c => {
    const query = search.toLowerCase();
    return (
      (c.client_nom || '').toLowerCase().includes(query) ||
      (c.telephone || '').toLowerCase().includes(query) ||
      (c.code_commande || '').toLowerCase().includes(query) ||
      (c.designation || '').toLowerCase().includes(query)
    );
  });

  // Groupement par statut (Considère 'Soldée' comme 'Livrée')
  const colRecue = filteredCommandes.filter(c => !c.statut || c.statut === 'Reçue');
  const colCoupe = filteredCommandes.filter(c => c.statut === 'En Coupe');
  const colPrete = filteredCommandes.filter(c => c.statut === 'Prête');
  const colLivree = filteredCommandes.filter(c => c.statut === 'Livrée' || c.statut === 'Soldée');

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-800 mb-2 transition-colors"
            >
              <ArrowLeft size={14} /> Retour au tableau de bord
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Suivi d'Atelier & Commandes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ousmane Design — Pilotage de la production
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer text-sm"
          >
            <Plus size={18} /> Nouvelle Commande
          </button>
        </div>

        {/* BARRE DE RECHERCHE */}
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par client, téléphone ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700 transition-all shadow-xs"
          />
        </div>

        {/* BOARD KANBAN DE PRODUCTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* COLONNE 1: REÇUE */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-3 min-h-[500px]">
            <div className="flex justify-between items-center px-1 mb-1">
              <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-blue-600" /> Reçue
              </h3>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {colRecue.length}
              </span>
            </div>

            {colRecue.map(c => (
              <CommandeCard key={c.id} c={c} updateStatut={updateStatut} deleteCommande={deleteCommande} formatAmount={formatAmount} />
            ))}
            {colRecue.length === 0 && <EmptyState />}
          </div>

          {/* COLONNE 2: EN COUPE */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-3 min-h-[500px]">
            <div className="flex justify-between items-center px-1 mb-1">
              <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Scissors size={16} className="text-amber-600" /> En Coupe
              </h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {colCoupe.length}
              </span>
            </div>

            {colCoupe.map(c => (
              <CommandeCard key={c.id} c={c} updateStatut={updateStatut} deleteCommande={deleteCommande} formatAmount={formatAmount} />
            ))}
            {colCoupe.length === 0 && <EmptyState />}
          </div>

          {/* COLONNE 3: PRÊTE */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-3 min-h-[500px]">
            <div className="flex justify-between items-center px-1 mb-1">
              <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <PackageCheck size={16} className="text-purple-600" /> Prête
              </h3>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {colPrete.length}
              </span>
            </div>

            {colPrete.map(c => (
              <CommandeCard key={c.id} c={c} updateStatut={updateStatut} deleteCommande={deleteCommande} formatAmount={formatAmount} />
            ))}
            {colPrete.length === 0 && <EmptyState />}
          </div>

          {/* COLONNE 4: LIVRÉE / SOLDÉE */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-3 min-h-[500px]">
            <div className="flex justify-between items-center px-1 mb-1">
              <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Livrée / Soldée
              </h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {colLivree.length}
              </span>
            </div>

            {colLivree.map(c => (
              <CommandeCard key={c.id} c={c} updateStatut={updateStatut} deleteCommande={deleteCommande} formatAmount={formatAmount} />
            ))}
            {colLivree.length === 0 && <EmptyState />}
          </div>

        </div>

      </div>

      {/* MODAL NOUVELLE COMMANDE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-4">Nouvelle Commande Atelier</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom du Client *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: M. Moussa Sarr"
                  value={form.client_nom}
                  onChange={(e) => setForm({ ...form, client_nom: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone</label>
                <input
                  type="text"
                  placeholder="ex: 77 000 00 00"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Désignation / Article *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Caftan 3 pièces"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Montant Total (F)</label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={form.montant_total}
                    onChange={(e) => setForm({ ...form, montant_total: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Avance Versée (F)</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={form.avance}
                    onChange={(e) => setForm({ ...form, avance: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-700 text-white text-xs font-bold rounded-xl hover:bg-amber-800 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Composant Carte Commande
function CommandeCard({ c, updateStatut, deleteCommande, formatAmount }: { 
  c: Commande; 
  updateStatut: (id: string, st: string) => void;
  deleteCommande: (id: string) => void;
  formatAmount: (val: number) => string;
}) {
  const tot = Number(c.montant_total) || 0;
  let av = Number(c.avance) || 0;

  if (c.statut === 'Livrée' || c.statut === 'Soldée') {
    av = tot;
  }

  const isFullyPaid = av >= tot && tot > 0;

  const handleWhatsapp = () => {
    if (!c.telephone) return;
    const cleanPhone = c.telephone.replace(/\s+/g, '').replace('+', '');
    const msg = `Bonjour ${c.client_nom}, votre commande (${c.designation}) chez Ousmane Design est disponible.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 relative group">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h4 className="font-bold text-slate-900 text-sm leading-snug">{c.client_nom || 'Client Inconnu'}</h4>
          <p className="text-[11px] font-medium text-slate-400">({c.telephone || '-'})</p>
        </div>
        <div className="flex items-center gap-1.5">
          {c.code_commande && (
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {c.code_commande}
            </span>
          )}
          <button 
            onClick={() => deleteCommande(c.id)}
            className="text-slate-300 hover:text-rose-600 transition-colors p-0.5"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
        {c.designation || 'Commande sur mesure'}
      </p>

      <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs font-bold">
        <span className="text-slate-600">Total: {formatAmount(tot)} F</span>
        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-black ${
          isFullyPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {isFullyPaid ? 'PAYÉ (100%)' : `Avance: ${formatAmount(av)} F`}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <select
          value={c.statut || 'Reçue'}
          onChange={(e) => updateStatut(c.id, e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-hidden focus:border-amber-700"
        >
          <option value="Reçue">Reçue</option>
          <option value="En Coupe">En Coupe</option>
          <option value="Prête">Prête</option>
          <option value="Livrée">Livrée / Soldée</option>
        </select>

        {c.telephone && (
          <button
            onClick={handleWhatsapp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            title="Envoyer un message WhatsApp"
          >
            <Send size={12} /> Alerter
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-28 border-2 border-dashed border-slate-200/70 rounded-xl flex items-center justify-center text-xs font-medium text-slate-400 italic">
      Aucune commande
    </div>
  );
}
