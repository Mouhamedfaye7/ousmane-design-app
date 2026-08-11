'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Printer, Send, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Commande {
  id?: string;
  code?: string;
  client_nom: string;
  client_phone: string;
  description: string;
  montant_total: number;
  acompte: number;
  statut: 'Reçue' | 'En Coupe' | 'Prête' | 'Livrée';
  created_at?: string;
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);

  const [form, setForm] = useState<Commande>({
    client_nom: '',
    client_phone: '',
    description: '',
    montant_total: 0,
    acompte: 0,
    statut: 'Reçue',
  });

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) setCommandes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_nom) return alert('Nom du client requis');

    const newCode = 'CMD-' + Math.floor(100000 + Math.random() * 900000);
    const payload = { ...form, code: newCode };

    try {
      const { data, error } = await supabase.from('commandes').insert([payload]).select();
      if (error) throw error;

      alert('Commande enregistrée avec succès !');
      setShowModal(false);
      setForm({ client_nom: '', client_phone: '', description: '', montant_total: 0, acompte: 0, statut: 'Reçue' });
      fetchCommandes();
    } catch (err: any) {
      alert('Erreur enregistrement : ' + err.message);
    }
  };

  const updateStatut = async (id: string, newStatut: Commande['statut']) => {
    await supabase.from('commandes').update({ statut: newStatut }).eq('id', id);
    fetchCommandes();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous supprimer cette commande / facture ?')) {
      await supabase.from('commandes').delete().eq('id', id);
      fetchCommandes();
    }
  };

  const handleShareWhatsApp = (cmd: Commande) => {
    let cleanPhone = (cmd.client_phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

    const reste = cmd.montant_total - cmd.acompte;
    let msg = `*OUSMANE DESIGN — Facture & Commande*\n`;
    msg += `Réf: *${cmd.code || 'CMD'}*\n`;
    msg += `Client: *${cmd.client_nom}*\n`;
    msg += `Désignation: ${cmd.description || 'Tenue sur mesure'}\n\n`;
    msg += `- Total: *${cmd.montant_total.toLocaleString()} FCFA*\n`;
    msg += `- Acompte versé: *${cmd.acompte.toLocaleString()} FCFA*\n`;
    msg += `- Reste à payer: *${reste.toLocaleString()} FCFA*\n`;
    msg += `- Statut atelier: *${cmd.statut}*\n\n`;
    msg += `Merci pour votre confiance !`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const filtered = commandes.filter(
    (c) =>
      c.client_nom?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_phone?.includes(search) ||
      c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const statuts: Commande['statut'][] = ['Reçue', 'En Coupe', 'Prête', 'Livrée'];

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Suivi d'Atelier, Ventes & Factures</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Gestion des commandes et facturation</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus size={18} /> Nouvelle Commande / Vente
        </button>
      </div>

      {/* RECHERCHE */}
      <div className="max-w-7xl mx-auto mb-6 print:hidden">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher par client, téléphone ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-sm outline-none"
          />
        </div>
      </div>

      {/* KANBAN ATELIER */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        {statuts.map((st) => {
          const list = filtered.filter((c) => c.statut === st);
          return (
            <div key={st} className="bg-slate-200/60 p-4 rounded-xl flex flex-col gap-3 min-h-[500px]">
              <div className="flex justify-between items-center font-bold text-slate-700 text-sm px-1">
                <span>{st}</span>
                <span className="bg-slate-300 text-slate-700 rounded-full text-xs px-2 py-0.5">{list.length}</span>
              </div>

              {list.map((cmd) => {
                const reste = cmd.montant_total - cmd.acompte;
                return (
                  <div key={cmd.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{cmd.client_nom}</h4>
                        <p className="text-xs text-slate-500">{cmd.client_phone}</p>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {cmd.code}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{cmd.description || 'Commande sur mesure'}</p>

                    <div className="text-xs font-semibold pt-1 border-t border-slate-100 flex justify-between">
                      <span>Total: {cmd.montant_total.toLocaleString()} F</span>
                      <span className={reste > 0 ? 'text-amber-700' : 'text-emerald-600'}>
                        Reste: {reste.toLocaleString()} F
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <select
                        value={cmd.statut}
                        onChange={(e) => updateStatut(cmd.id!, e.target.value as Commande['statut'])}
                        className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none"
                      >
                        {statuts.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleShareWhatsApp(cmd)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Envoyer Facture WhatsApp"
                        >
                          <Send size={15} />
                        </button>
                        <button
                          onClick={() => setSelectedCommande(cmd)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                          title="Imprimer Facture"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(cmd.id!)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* MODAL NOUVELLE COMMANDE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Nouvelle Commande / Facture</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom du client</label>
                <input
                  type="text"
                  required
                  value={form.client_nom}
                  onChange={(e) => setForm({ ...form, client_nom: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone</label>
                <input
                  type="text"
                  value={form.client_phone}
                  onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description du Modèle / Vêtement</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prix Total (FCFA)</label>
                  <input
                    type="number"
                    value={form.montant_total || ''}
                    onChange={(e) => setForm({ ...form, montant_total: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Acompte (FCFA)</label>
                  <input
                    type="number"
                    value={form.acompte || ''}
                    onChange={(e) => setForm({ ...form, acompte: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-amber-700 text-white hover:bg-amber-800 rounded-lg"
                >
                  Enregistrer & Facturer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APERÇU FACTURE IMPRIMABLE */}
      {selectedCommande && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 print:p-0 print:static print:bg-white">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-6 print:shadow-none print:w-full">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-amber-900">OUSMANE DESIGN</h2>
                <p className="text-xs text-slate-500">Haute Couture & Sur-Mesure</p>
                <p className="text-xs text-slate-500">Dakar, Sénégal — Tél: +221 77 000 00 00</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-700 block">{selectedCommande.code}</span>
                <span className="text-[11px] text-slate-400">FACTURE / REÇU</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <p><strong>Client:</strong> {selectedCommande.client_nom}</p>
              <p><strong>Téléphone:</strong> {selectedCommande.client_phone || 'N/A'}</p>
              <p><strong>Désignation:</strong> {selectedCommande.description || 'Tenue Sur-Mesure'}</p>
            </div>

            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-2 border-r">Élément</th>
                  <th className="p-2 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-2 border-r">Total Commande</td>
                  <td className="p-2 text-right font-bold">{selectedCommande.montant_total.toLocaleString()} FCFA</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-2 border-r">Acompte Versé</td>
                  <td className="p-2 text-right text-emerald-600 font-bold">{selectedCommande.acompte.toLocaleString()} FCFA</td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="p-2 border-r font-bold">Reste à Payer</td>
                  <td className="p-2 text-right font-bold text-amber-800">
                    {(selectedCommande.montant_total - selectedCommande.acompte).toLocaleString()} FCFA
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-center pt-4 print:hidden">
              <button
                onClick={() => setSelectedCommande(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg flex items-center gap-2"
              >
                <Printer size={16} /> Imprimer Reçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
