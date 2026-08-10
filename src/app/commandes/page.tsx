'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, Trash2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Commande {
  id: string;
  code_commande: string;
  client_nom: string;
  client_tel: string;
  description: string;
  montant_total: number;
  acompte: number;
  statut: string;
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    setLoading(true);
    const { data } = await supabase.from('commandes').select('*').order('created_at', { ascending: false });
    if (data) setCommandes(data);
    setLoading(false);
  };

  const handleUpdateStatut = async (id: string, newStatut: string) => {
    await supabase.from('commandes').update({ statut: newStatut }).eq('id', id);
    fetchCommandes();
  };

  const handleDeleteCommande = async (id: string, clientNom: string) => {
    if (confirm(`Voulez-vous supprimer la commande de ${clientNom || 'ce client'} ?`)) {
      await supabase.from('commandes').delete().eq('id', id);
      fetchCommandes();
    }
  };

  const filteredCommandes = commandes.filter(c =>
    (c.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.client_tel || '').includes(search) ||
    (c.code_commande || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = ['Reçue', 'En Coupe', 'Prête', 'Livrée'];

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Suivi d'Atelier & Commandes</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Pilotage de la production</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative max-w-md bg-white rounded-lg border border-slate-200">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher par client, téléphone ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border-none bg-transparent outline-none focus:ring-2 focus:ring-amber-500 rounded-lg"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((colStatut) => {
          const list = filteredCommandes.filter(c => (c.statut || 'Reçue') === colStatut);
          return (
            <div key={colStatut} className="bg-slate-200/60 p-3 rounded-xl min-h-[500px]">
              <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="font-bold text-sm text-slate-700">{colStatut}</h2>
                <span className="bg-slate-300 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {list.length}
                </span>
              </div>

              <div className="space-y-3">
                {list.map((cmd) => {
                  const reste = (cmd.montant_total || 0) - (cmd.acompte || 0);
                  return (
                    <div key={cmd.id} className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{cmd.client_nom || 'Client sans nom'}</h3>
                          <p className="text-xs text-slate-400">{cmd.client_tel || '(-)'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {cmd.code_commande || 'CMD'}
                          </span>
                          <button
                            onClick={() => handleDeleteCommande(cmd.id, cmd.client_nom)}
                            className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                            title="Supprimer la commande"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600">{cmd.description || 'Commande sur mesure'}</p>

                      <div className="flex justify-between text-xs pt-2 border-t border-slate-100 font-medium">
                        <span>Total: <strong className="text-slate-800">{cmd.montant_total || 0} F</strong></span>
                        <span className="text-amber-800">Reste: <strong>{reste} F</strong></span>
                      </div>

                      <div className="pt-1">
                        <select
                          value={cmd.statut || 'Reçue'}
                          onChange={(e) => handleUpdateStatut(cmd.id, e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none font-semibold"
                        >
                          {columns.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
