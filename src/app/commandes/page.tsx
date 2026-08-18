'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Send, X, CheckCircle, CreditCard, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Commande {
  id?: string;
  code_commande?: string;
  client_nom: string;
  client_tel: string;
  statut?: string;
  designation?: string;
  article?: string;
  description?: string;
  modele?: string;
  quantite?: number;
  prix_unitaire?: number;
  montant_total?: number;
  avance?: number;
  reste?: number;
  observations?: string;
  created_at?: string;
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal d'édition de paiement
  const [selectedCommandeForPay, setSelectedCommandeForPay] = useState<Commande | null>(null);
  const [newAvanceInput, setNewAvanceInput] = useState<string>('');

  const [formData, setFormData] = useState({
    client_nom: '',
    client_tel: '',
    designation: '',
    quantite: '1',
    prix_unitaire: '',
    avance: '',
    observations: ''
  });

  const fetchCommandes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('commandes').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setCommandes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommandes();
  }, []);

  const qtyNum = Number(formData.quantite) || 1;
  const puNum = Number(formData.prix_unitaire) || 0;
  const montantTotalCalcul = qtyNum * puNum;
  const avanceNum = Number(formData.avance) || 0;
  const resteCalcul = Math.max(0, montantTotalCalcul - avanceNum);

  const handleCreateCommande = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_nom || !formData.designation) {
      alert('Veuillez remplir le nom du client et l\'article/désignation.');
      return;
    }

    const randomCode = 'CMD-' + Math.floor(100000 + Math.random() * 900000);

    const payload = {
      code_commande: randomCode,
      client_nom: formData.client_nom,
      client_tel: formData.client_tel,
      statut: 'Reçue',
      designation: formData.designation,
      quantite: qtyNum,
      prix_unitaire: puNum,
      montant_total: montantTotalCalcul,
      avance: avanceNum,
      reste: resteCalcul,
      observations: formData.observations
    };

    const { error } = await supabase.from('commandes').insert([payload]);

    if (error) {
      alert('Erreur lors de la création : ' + error.message);
      return;
    }

    setShowAddModal(false);
    setFormData({
      client_nom: '',
      client_tel: '',
      designation: '',
      quantite: '1',
      prix_unitaire: '',
      avance: '',
      observations: ''
    });
    fetchCommandes();
  };

  const handleUpdateStatut = async (id: string, newStatut: string) => {
    const { error } = await supabase.from('commandes').update({ statut: newStatut }).eq('id', id);
    if (!error) {
      setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut: newStatut } : c));
    }
  };

  // --- ACTION : SOLDER EN 1 CLIC (PAIEMENT 100%) ---
  const handleSolderCommande = async (c: Commande) => {
    if (!c.id) return;
    const tot = Number(c.montant_total) || 0;

    const { error } = await supabase.from('commandes').update({
      avance: tot,
      reste: 0
    }).eq('id', c.id);

    if (!error) {
      setCommandes(prev => prev.map(item => item.id === c.id ? { ...item, avance: tot, reste: 0 } : item));
    } else {
      alert('Erreur lors de la mise à jour du paiement : ' + error.message);
    }
  };

  // --- ACTION : MISE À JOUR DE L'AVANCE SUR MESURE ---
  const handleSavePaymentUpdate = async () => {
    if (!selectedCommandeForPay || !selectedCommandeForPay.id) return;
    const tot = Number(selectedCommandeForPay.montant_total) || 0;
    const newAv = Number(newAvanceInput) || 0;
    const newReste = Math.max(0, tot - newAv);

    const { error } = await supabase.from('commandes').update({
      avance: newAv,
      reste: newReste
    }).eq('id', selectedCommandeForPay.id);

    if (!error) {
      setCommandes(prev => prev.map(item => item.id === selectedCommandeForPay.id ? { ...item, avance: newAv, reste: newReste } : item));
      setSelectedCommandeForPay(null);
    } else {
      alert('Erreur : ' + error.message);
    }
  };

  // --- ACTION : SUPPRIMER UNE COMMANDE ---
  const handleDeleteCommande = async (c: Commande) => {
    if (!c.id) return;

    const confirmDelete = confirm(
      `Voulez-vous vraiment supprimer la commande ${c.code_commande || ''} de ${c.client_nom} ?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from('commandes').delete().eq('id', c.id);

    if (!error) {
      setCommandes(prev => prev.filter(item => item.id !== c.id));
    } else {
      alert('Erreur lors de la suppression : ' + error.message);
    }
  };

  const formatAmount = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  const getItemName = (c: Commande) => {
    return c.designation || c.article || c.description || c.modele || 'Commande sur mesure';
  };

  const handleAlertWhatsApp = (c: Commande) => {
    let cleanPhone = (c.client_tel || '').trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = '221' + cleanPhone;
    }

    const total = c.montant_total || 0;
    const avance = c.avance || 0;
    const reste = c.reste !== undefined ? c.reste : Math.max(0, total - avance);
    const clientName = (c.client_nom || 'Client').trim();
    const statut = c.statut || 'Reçue';
    const code = c.code_commande || '';

    let messageIntro = '';
    if (statut === 'Reçue') {
      messageIntro = `Votre commande *${code}* (${getItemName(c)}) a bien été enregistrée à l'atelier.`;
    } else if (statut === 'En Coupe') {
      messageIntro = `Votre commande *${code}* (${getItemName(c)}) est actuellement en cours de coupe et de confection à l'atelier.`;
    } else if (statut === 'Prête') {
      messageIntro = `Bonne nouvelle ! Votre commande *${code}* (${getItemName(c)}) est *PRÊTE* ! Vous pouvez passer la récupérer à l'atelier.`;
    } else if (statut === 'Livrée') {
      messageIntro = `Votre commande *${code}* (${getItemName(c)}) vous a été livrée. Merci de votre confiance !`;
    } else {
      messageIntro = `Statut de votre commande *${code}* (${getItemName(c)}) : *${statut}*.`;
    }

    const textMsg = `Bonjour ${clientName},\n\n${messageIntro}\n\n` +
      `📌 *Récapitulatif financier* :\n` +
      `- Total : ${formatAmount(total)} FCFA\n` +
      `- Avance : ${formatAmount(avance)} FCFA\n` +
      `- Reste à payer : *${formatAmount(reste)} FCFA*\n\n` +
      `Merci d'avoir choisi *Ousmane Design* !`;

    const encodedText = encodeURIComponent(textMsg);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  const filteredCommandes = commandes.filter(c =>
    (c.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.client_tel || '').includes(search) ||
    (c.code_commande || '').toLowerCase().includes(search.toLowerCase()) ||
    getItemName(c).toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: 'Reçue', key: 'Reçue' },
    { title: 'En Coupe', key: 'En Coupe' },
    { title: 'Prête', key: 'Prête' },
    { title: 'Livrée', key: 'Livrée' }
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Suivi d'Atelier & Commandes</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Pilotage de la production</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer self-start md:self-auto"
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
        {columns.map(col => {
          const items = filteredCommandes.filter(c => (c.statut || 'Reçue') === col.key);
          return (
            <div key={col.key} className="bg-slate-200/60 p-4 rounded-xl border border-slate-300/60 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-800 text-sm">{col.title}</h2>
                <span className="bg-slate-300 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-6">Chargement...</p>
                ) : items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">Aucune commande</p>
                ) : (
                  items.map(c => {
                    const total = Number(c.montant_total) || 0;
                    const avance = Number(c.avance) || 0;
                    const isFullyPaid = avance >= total && total > 0;
                    const reste = isFullyPaid ? 0 : Math.max(0, total - avance);

                    return (
                      <div key={c.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">{c.client_nom || 'Client sans nom'}</h3>
                            <p className="text-xs text-slate-500">({c.client_tel || '-'})</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {c.code_commande && (
                              <span className="text-[10px] bg-slate-100 border border-slate-300 font-mono font-semibold px-1.5 py-0.5 rounded text-slate-600">
                                {c.code_commande}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteCommande(c)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                              title="Supprimer la commande"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 font-medium">{getItemName(c)}</p>

                        {/* RECAP FINANCIER + BOUTONS PAIEMENT */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Total: <strong className="text-slate-800">{formatAmount(total)} F</strong></span>
                            {isFullyPaid ? (
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle size={10} /> PAYÉ (100%)
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold">Reste: {formatAmount(reste)} F</span>
                            )}
                          </div>

                          {!isFullyPaid && (
                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={() => handleSolderCommande(c)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2 py-1 rounded flex-1 transition-colors cursor-pointer"
                              >
                                ✓ Solder (100%)
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCommandeForPay(c);
                                  setNewAvanceInput(String(c.avance || 0));
                                }}
                                className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                Modifier avance
                              </button>
                            </div>
                          )}
                        </div>

                        {/* CHANGEMENT STATUT */}
                        <div className="pt-2 border-t border-slate-100">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Statut de fabrication
                          </label>
                          <select
                            value={c.statut || 'Reçue'}
                            onChange={(e) => c.id && handleUpdateStatut(c.id, e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-md bg-slate-50 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="Reçue">Reçue</option>
                            <option value="En Coupe">En Coupe</option>
                            <option value="Prête">Prête</option>
                            <option value="Livrée">Livrée</option>
                          </select>
                        </div>

                        {/* BOUTON WHATSAPP - pleine largeur, toujours visible */}
                        <button
                          onClick={() => handleAlertWhatsApp(c)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-md flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          title="Alerter le client sur WhatsApp"
                        >
                          <Send size={14} />
                          <span>Alerter le client sur WhatsApp</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL MODIFICATION PAIEMENT / AVANCE */}
      {selectedCommandeForPay && (
        <div
          onClick={() => setSelectedCommandeForPay(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl relative border border-slate-200 space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <CreditCard size={16} className="text-amber-600" /> Éditer le paiement
              </h3>
              <button onClick={() => setSelectedCommandeForPay(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-800">{selectedCommandeForPay.client_nom}</p>
              <p className="text-slate-500">Montant total: <strong>{formatAmount(selectedCommandeForPay.montant_total)} FCFA</strong></p>

              <div>
                <label className="block font-semibold mt-3 mb-1">Nouvel acompte / Avance versée (FCFA)</label>
                <input
                  type="number"
                  value={newAvanceInput}
                  onChange={(e) => setNewAvanceInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCommandeForPay(null)}
                className="px-3 py-1.5 rounded-md bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePaymentUpdate}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE COMMANDE */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200"
          >
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Nouvelle Commande</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCommande} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Nom du client *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_nom}
                    onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.client_tel}
                    onChange={(e) => setFormData({ ...formData, client_tel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Désignation / Article *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Boubou Bazin VIP, Caftan, costume..."
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Prix Unitaire (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 50000"
                    value={formData.prix_unitaire}
                    onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Montant Total</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatAmount(montantTotalCalcul)} FCFA`}
                    className="w-full p-2 border border-slate-200 rounded-md bg-slate-100 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Avance versée (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 25000"
                    value={formData.avance}
                    onChange={(e) => setFormData({ ...formData, avance: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reste à payer</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatAmount(resteCalcul)} FCFA`}
                    className="w-full p-2 border border-slate-200 rounded-md bg-amber-50 text-amber-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Observations / Mesures</label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Notes, détails du tissu ou mesures..."
                  className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                >
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
