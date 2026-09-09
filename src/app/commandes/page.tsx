'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Send, X, CheckCircle, CreditCard, Trash2, Package2, ClipboardList } from 'lucide-react';
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

// Palette de statut, purement visuelle : couleur d'accent + fond léger par colonne.
const COLUMN_META: Record<string, { accent: string; bg: string }> = {
  'Reçue': { accent: '#64748B', bg: '#F1F5F9' },
  'En Coupe': { accent: '#C9A24B', bg: '#FBF3E2' },
  'Prête': { accent: '#2C5AA0', bg: '#EAF1FB' },
  'Livrée': { accent: '#16A34A', bg: '#E8F5EF' },
};
const ORANGE = '#C1502E';
const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';

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
    <div className="min-h-screen" style={{ backgroundColor: '#F5F8FC' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-mono-tape { font-family: 'Space Mono', ui-monospace, monospace; }
      `}</style>

      {/* HEADER — bandeau navy premium */}
      <div className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-16 md:pb-20 relative">
          <Link
            href="/"
            className="font-body text-xs font-semibold flex items-center gap-1.5 mb-4 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            <ArrowLeft size={14} /> Retour au tableau de bord
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <h1 className="font-display italic font-semibold text-2xl md:text-3xl" style={{ color: '#FFFFFF' }}>
                Suivi d'Atelier & Commandes
              </h1>
              <p className="font-body text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Ousmane Design — Pilotage de la production
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="font-body font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 transition-all hover:-translate-y-0.5 shrink-0 cursor-pointer"
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              <Plus size={15} /> Nouvelle Commande
            </button>
          </div>
        </div>
      </div>

      {/* BARRE DE RECHERCHE — carte flottante sur le bandeau, alignée sur les autres pages */}
      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.25)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: NAVY, opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Rechercher par client, téléphone ou code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="font-body w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-full bg-slate-50 outline-none focus:ring-2 text-slate-900"
              style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
            />
          </div>
          <p className="font-body text-[11px] text-slate-400 shrink-0">
            {filteredCommandes.length} commande{filteredCommandes.length !== 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* KANBAN */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {columns.map(col => {
            const items = filteredCommandes.filter(c => (c.statut || 'Reçue') === col.key);
            const meta = COLUMN_META[col.key];
            const colTotal = items.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0);
            const colReste = items.reduce((acc, c) => {
              const t = Number(c.montant_total) || 0;
              const a = Number(c.avance) || 0;
              return acc + Math.max(0, t - a);
            }, 0);

            return (
              <div key={col.key} className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] flex flex-col overflow-hidden">
                <div className="px-4 pt-3.5 pb-3 space-y-1.5" style={{ backgroundColor: meta.bg, borderBottom: `2px solid ${meta.accent}22` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: meta.accent }}></span>
                      <h2 className="font-display font-semibold text-sm" style={{ color: '#16233D' }}>{col.title}</h2>
                    </div>
                    <span
                      className="text-xs font-bold rounded-full px-2 py-0.5 bg-white font-mono-tape"
                      style={{ color: meta.accent }}
                    >
                      {items.length}
                    </span>
                  </div>
                  {items.length > 0 && (
                    <p className="font-mono-tape text-[10px] text-slate-500 pl-4.5">
                      {formatAmount(colTotal)} F
                      {colReste > 0 && <span style={{ color: ORANGE }}> · {formatAmount(colReste)} F restant</span>}
                    </p>
                  )}
                </div>

                <div className="p-3 space-y-3 flex-1 min-h-[140px]">
                  {loading ? (
                    <p className="font-body text-xs text-slate-400 text-center py-6">Chargement...</p>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F1F5F9', color: '#94A3B8' }}>
                        <Package2 size={16} />
                      </span>
                      <p className="font-body text-xs text-slate-400 italic">Aucune commande</p>
                    </div>
                  ) : (
                    items.map(c => {
                      const total = Number(c.montant_total) || 0;
                      const avance = Number(c.avance) || 0;
                      const isFullyPaid = avance >= total && total > 0;
                      const reste = isFullyPaid ? 0 : Math.max(0, total - avance);
                      const pct = total > 0 ? Math.min(100, Math.max(0, (avance / total) * 100)) : 0;
                      const statutActuel = c.statut || 'Reçue';
                      const statutMeta = COLUMN_META[statutActuel] || COLUMN_META['Reçue'];

                      return (
                        <div
                          key={c.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h3 className="font-display font-semibold text-slate-900 text-sm truncate">{c.client_nom || 'Client sans nom'}</h3>
                              <p className="font-body text-[11px] text-slate-500">{c.client_tel || '-'}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.code_commande && (
                                <span
                                  className="font-mono-tape text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                                  style={{ borderColor: `${NAVY}33`, color: NAVY, backgroundColor: '#EAF1FB' }}
                                >
                                  {c.code_commande}
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteCommande(c)}
                                className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                title="Supprimer la commande"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <p className="font-body text-xs text-slate-700 font-medium leading-snug">{getItemName(c)}</p>

                          {/* RÉCAP FINANCIER — barre de progression du paiement */}
                          <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
                            <div className="flex justify-between items-baseline text-[11px] font-body">
                              <span className="text-slate-500">
                                Total <strong className="font-mono-tape text-slate-800">{formatAmount(total)} F</strong>
                              </span>
                              {isFullyPaid ? (
                                <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle size={10} /> PAYÉ (100%)
                                </span>
                              ) : (
                                <span className="font-mono-tape font-bold" style={{ color: ORANGE }}>
                                  {formatAmount(reste)} F restant
                                </span>
                              )}
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: isFullyPaid ? '#16A34A' : ORANGE }}
                              ></div>
                            </div>
                          </div>

                          {!isFullyPaid && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleSolderCommande(c)}
                                className="font-body bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2 py-1.5 rounded-full flex-1 transition-colors cursor-pointer"
                              >
                                ✓ Solder (100%)
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCommandeForPay(c);
                                  setNewAvanceInput(String(c.avance || 0));
                                }}
                                className="font-body bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-semibold px-2 py-1.5 rounded-full transition-colors cursor-pointer"
                              >
                                Modifier avance
                              </button>
                            </div>
                          )}

                          {/* STATUT — bordure gauche colorée pour un repérage rapide */}
                          <div className="pt-1">
                            <label className="font-body block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Statut de fabrication
                            </label>
                            <select
                              value={statutActuel}
                              onChange={(e) => c.id && handleUpdateStatut(c.id, e.target.value)}
                              className="font-body w-full text-xs p-2 rounded-md bg-slate-50 font-semibold text-slate-700 outline-none focus:ring-1 cursor-pointer border-l-[3px]"
                              style={{ borderLeftColor: statutMeta.accent, borderTop: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}
                            >
                              <option value="Reçue">Reçue</option>
                              <option value="En Coupe">En Coupe</option>
                              <option value="Prête">Prête</option>
                              <option value="Livrée">Livrée</option>
                            </select>
                          </div>

                          <button
                            onClick={() => handleAlertWhatsApp(c)}
                            className="font-body w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2.5 rounded-full flex items-center justify-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
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
      </div>

      {/* MODAL MODIFICATION PAIEMENT / AVANCE */}
      {selectedCommandeForPay && (
        <div
          onClick={() => setSelectedCommandeForPay(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative border border-slate-200 space-y-4 font-body"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FBF3E2', color: GOLD }}>
                  <CreditCard size={15} />
                </span>
                <h3 className="font-display font-semibold text-sm" style={{ color: NAVY }}>
                  Éditer le paiement
                </h3>
              </div>
              <button onClick={() => setSelectedCommandeForPay(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-display font-semibold text-slate-800 text-sm">{selectedCommandeForPay.client_nom}</p>
              <p className="text-slate-500">Montant total : <strong className="font-mono-tape text-slate-800">{formatAmount(selectedCommandeForPay.montant_total)} FCFA</strong></p>

              <div>
                <label className="block font-bold mt-3 mb-1 text-slate-600">Nouvel acompte / Avance versée (FCFA)</label>
                <input
                  type="number"
                  value={newAvanceInput}
                  onChange={(e) => setNewAvanceInput(e.target.value)}
                  className="font-mono-tape w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCommandeForPay(null)}
                className="px-4 py-2 rounded-full bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePaymentUpdate}
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5"
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
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 font-body"
          >
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FBF3E2', color: GOLD }}>
                  <ClipboardList size={17} />
                </span>
                <h2 className="font-display italic font-semibold text-lg" style={{ color: NAVY }}>Nouvelle Commande</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCommande} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Nom du client *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_nom}
                    onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:ring-2"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Téléphone</label>
                  <input
                    type="text"
                    value={formData.client_tel}
                    onChange={(e) => setFormData({ ...formData, client_tel: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:ring-2"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Désignation / Article *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Boubou Bazin VIP, Caftan, costume..."
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:ring-2"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:ring-2"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Prix Unitaire (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 50000"
                    value={formData.prix_unitaire}
                    onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:ring-2"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Montant Total</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatAmount(montantTotalCalcul)} FCFA`}
                    className="font-mono-tape w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Avance versée (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 25000"
                    value={formData.avance}
                    onChange={(e) => setFormData({ ...formData, avance: e.target.value })}
                    className="font-mono-tape w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 text-emerald-600 font-bold"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Reste à payer</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatAmount(resteCalcul)} FCFA`}
                    className="font-mono-tape w-full p-2.5 border border-slate-200 rounded-lg font-bold"
                    style={{ backgroundColor: '#FBEAE3', color: ORANGE }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Observations / Mesures</label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Notes, détails du tissu ou mesures..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:ring-2"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-200 font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full font-bold cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: GOLD, color: NAVY }}
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
