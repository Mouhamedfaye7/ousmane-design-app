'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Printer, MessageCircle, X, Search } from 'lucide-react';

interface Commande {
  id: string;
  client: string;
  telephone: string;
  habits: string;
  total: number;
  avance: number;
  reste: number;
  statut: 'Reçue' | 'En Coupe' | 'Prête' | 'Livrée';
  dateLivraison: string;
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([
    {
      id: 'CMD-803678',
      client: 'Mouhamed Faye',
      telephone: '785112139',
      habits: 'caftane',
      total: 50000,
      avance: 20000,
      reste: 30000,
      statut: 'Reçue',
      dateLivraison: '15/08/2026'
    },
    {
      id: 'CMD-390253',
      client: 'Ibrahima Diallo',
      telephone: '771234567',
      habits: 'Grand boubou',
      total: 100000,
      avance: 50000,
      reste: 50000,
      statut: 'Prête',
      dateLivraison: '12/08/2026'
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);

  // Formulaire
  const [client, setClient] = useState('');
  const [telephone, setTelephone] = useState('');
  const [habits, setHabits] = useState('');
  const [total, setTotal] = useState('');
  const [avance, setAvance] = useState('');
  const [dateLivraison, setDateLivraison] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('ousmane_commandes');
    if (saved) {
      try { setCommandes(JSON.parse(saved)); } catch (e) {}
    } else {
      localStorage.setItem('ousmane_commandes', JSON.stringify(commandes));
    }
  }, []);

  const saveAndSetCommandes = (newCmds: Commande[]) => {
    setCommandes(newCmds);
    localStorage.setItem('ousmane_commandes', JSON.stringify(newCmds));
  };

  const handleStatutChange = (id: string, newStatut: Commande['statut']) => {
    const updated = commandes.map(cmd => cmd.id === id ? { ...cmd, statut: newStatut } : cmd);
    saveAndSetCommandes(updated);
  };

  const handleCreateCommande = (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = Number(total) || 0;
    const avanceNum = Number(avance) || 0;

    const newCmd: Commande = {
      id: `CMD-${Math.floor(100000 + Math.random() * 900000)}`,
      client,
      telephone,
      habits,
      total: totalNum,
      avance: avanceNum,
      reste: totalNum - avanceNum,
      statut: 'Reçue',
      dateLivraison: dateLivraison || 'A définir'
    };

    saveAndSetCommandes([newCmd, ...commandes]);
    setShowModal(false);
    
    // Reset
    setClient('');
    setTelephone('');
    setHabits('');
    setTotal('');
    setAvance('');
    setDateLivraison('');
  };

  const statuts: Commande['statut'][] = ['Reçue', 'En Coupe', 'Prête', 'Livrée'];

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
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Nouvelle Commande
        </button>
      </div>

      {/* Colonnes Kanban */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        {statuts.map((colStatut) => {
          const list = commandes.filter(c => c.statut === colStatut);
          return (
            <div key={colStatut} className="bg-slate-200/60 rounded-xl p-3 border border-slate-200 min-h-[500px]">
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-slate-800 text-sm">{colStatut}</h3>
                <span className="bg-slate-300 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{list.length}</span>
              </div>

              <div className="space-y-3">
                {list.map((cmd) => (
                  <div key={cmd.id} className="bg-white p-4 rounded-lg shadow-xs border border-slate-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{cmd.client}</h4>
                        <p className="text-xs text-slate-500">({cmd.telephone})</p>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded border">{cmd.id}</span>
                    </div>

                    <p className="text-xs text-slate-700 capitalize font-medium">{cmd.habits}</p>

                    <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Total: <strong className="text-slate-900">{cmd.total.toLocaleString()} F</strong></span>
                      <span className="text-slate-500">Reste: <strong className="text-amber-700">{cmd.reste.toLocaleString()} F</strong></span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <select
                        value={cmd.statut}
                        onChange={(e) => handleStatutChange(cmd.id, e.target.value as Commande['statut'])}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50 text-slate-800 focus:outline-none"
                      >
                        {statuts.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>

                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedCommande(cmd)} className="text-slate-400 hover:text-slate-600 p-1">
                          <Printer size={15} />
                        </button>
                        <button 
                          onClick={() => {
                            const msg = encodeURIComponent(`Bonjour ${cmd.client}, votre commande ${cmd.id} (${cmd.habits}) chez Ousmane Design est au statut: *${cmd.statut}*. Reste à payer: ${cmd.reste.toLocaleString()} FCFA.`);
                            window.open(`https://wa.me/221${cmd.telephone}?text=${msg}`, '_blank');
                          }}
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                        >
                          <MessageCircle size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {list.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8 italic">Aucune commande</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nouvelle Commande */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nouvelle Commande Sur-Mesure</h2>
            <form onSubmit={handleCreateCommande} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nom du Client *</label>
                <input type="text" value={client} onChange={e => setClient(e.target.value)} required className="w-full border rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Téléphone *</label>
                <input type="text" value={telephone} onChange={e => setTelephone(e.target.value)} required className="w-full border rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Habits / Modèle *</label>
                <input type="text" value={habits} onChange={e => setHabits(e.target.value)} placeholder="Ex: Caftan 3 pièces" required className="w-full border rounded-lg p-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Total (FCFA) *</label>
                  <input type="number" value={total} onChange={e => setTotal(e.target.value)} required className="w-full border rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Avance (FCFA)</label>
                  <input type="number" value={avance} onChange={e => setAvance(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Date de livraison prévue</label>
                <input type="date" value={dateLivraison} onChange={e => setDateLivraison(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700">Créer la commande</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
