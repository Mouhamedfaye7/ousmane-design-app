'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, Trash2, Send, X } from 'lucide-react';
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
  date_livraison?: string;
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Formulaire nouvelle commande
  const [newClientNom, setNewClientNom] = useState('');
  const [newClientTel, setNewClientTel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMontant, setNewMontant] = useState('');
  const [newAcompte, setNewAcompte] = useState('');
  const [newDateLivraison, setNewDateLivraison] = useState('');

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
    if (confirm(`Voulez-vous vraiment supprimer la commande de ${clientNom || 'ce client'} ?`)) {
      await supabase.from('commandes').delete().eq('id', id);
      fetchCommandes();
    }
  };

  const handleAlertWhatsApp = (cmd: Commande) => {
    let cleanPhone = (cmd.client_tel || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

    const reste = (cmd.montant_total || 0) - (cmd.acompte || 0);

    let msg = `Bonjour *${cmd.client_nom || 'Cher client'}*,\n\n`;
    msg += `Votre commande (*${cmd.code_commande || 'Ousmane Design'}*) est actuellement au statut : *${cmd.statut || 'En cours'}*.\n`;
    if (cmd.description) msg += `Article : ${cmd.description}\n`;
    if (reste > 0) msg += `Reste à payer : ${reste.toLocaleString('fr-FR')} FCFA\n`;
    msg += `\nMerci pour votre confiance chez *Ousmane Design* !`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCreateCommande = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientNom) return alert('Veuillez entrer le nom du client.');

    const code = 'CMD-' + Math.floor(100000 + Math.random() * 900000);
    const montant = Number(newMontant) || 0;
    const acompte = Number(newAcompte) || 0;

    const payload = {
      code_commande: code,
      client_nom: newClientNom,
      client_tel: newClientTel,
      description: newDesc,
      montant_total: montant,
      acompte: acompte,
      statut: 'Reçue',
      date_livraison: newDateLivraison || null
    };

    const { error } = await supabase.from('commandes').insert([payload]);

    if (!error) {
      // Également enregistrer/mettre à jour dans la table 'clients' si nécessaire
      if (newClientNom) {
        await supabase.from('clients').insert([{
          nom: newClientNom,
          telephone: newClientTel
        }]);
      }

      setShowModal(false);
      setNewClientNom('');
      setNewClientTel('');
      setNewDesc('');
      setNewMontant('');
      setNewAcompte('');
      setNewDateLivraison('');
      fetchCommandes();
    } else {
      alert('Erreur lors de la création de la commande : ' + error.message);
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

        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer text-sm"
        >
          <Plus size={18} /> Nouvelle Commande
        </button>
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
                            className="text-slate-300 hover:text-red-500 p-1 transition-colors cursor-pointer"
                            title="Supprimer la commande"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600">{cmd.description || 'Commande sur mesure'}</p>

                      <div className="flex justify-between text-xs pt-2 border-t border-slate-100 font-medium">
                        <span>Total: <strong className="text-slate-800">{(cmd.montant_total || 0).toLocaleString('fr-FR')} F</strong></span>
                        <span className="text-amber-800">Reste: <strong>{reste.toLocaleString('fr-FR')} F</strong></span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <select
                          value={cmd.statut || 'Reçue'}
                          onChange={(e) => handleUpdateStatut(cmd.id, e.target.value)}
                          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none font-semibold cursor-pointer"
                        >
                          {columns.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleAlertWhatsApp(cmd)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          title="Alerter le client sur WhatsApp"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALE CRÉATION COMMANDE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Créer une nouvelle commande</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCommande} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom du Client *</label>
                <input
                  type="text"
                  required
                  value={newClientNom}
                  onChange={(e) => setNewClientNom(e.target.value)}
                  placeholder="Ex: Omar Diome"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone Client</label>
                <input
                  type="text"
                  value={newClientTel}
                  onChange={(e) => setNewClientTel(e.target.value)}
                  placeholder="Ex: 772028031"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Modèle / Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Grand Boubou 3 pièces, tissu Bazin royal bleu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Montant Total (FCFA)</label>
                  <input
                    type="number"
                    value={newMontant}
                    onChange={(e) => setNewMontant(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Acompte versé (FCFA)</label>
                  <input
                    type="number"
                    value={newAcompte}
                    onChange={(e) => setNewAcompte(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Date de livraison souhaitée</label>
                <input
                  type="date"
                  value={newDateLivraison}
                  onChange={(e) => setNewDateLivraison(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Enregistrer Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
