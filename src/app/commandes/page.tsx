'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Search, Send, X, CheckCircle, CreditCard, Trash2,
  FileDown, Pencil, Loader2, MapPin, Phone
} from 'lucide-react';
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

const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';
const ORANGE = '#C1502E';

const STATUTS = ['Reçue', 'En Coupe', 'Prête', 'Livrée'];

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal d'édition du prix & du paiement (fusionnés)
  const [selectedCommandeForPay, setSelectedCommandeForPay] = useState<Commande | null>(null);
  const [newTotalInput, setNewTotalInput] = useState<string>('');
  const [newAvanceInput, setNewAvanceInput] = useState<string>('');

  // Génération du PDF d'alerte + envoi WhatsApp
  const [selectedCommandeForAlert, setSelectedCommandeForAlert] = useState<Commande | null>(null);
  const [pendingAlert, setPendingAlert] = useState<Commande | null>(null);
  const alerteRef = useRef<HTMLDivElement>(null);

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

  // --- OUVRE LE MODAL DE MODIFICATION PRIX + PAIEMENT ---
  const ouvrirModalPrix = (c: Commande) => {
    setSelectedCommandeForPay(c);
    setNewTotalInput(String(c.montant_total || 0));
    setNewAvanceInput(String(c.avance || 0));
  };

  // --- ACTION : ENREGISTRER LE NOUVEAU PRIX & LA NOUVELLE AVANCE ---
  const handleSavePaymentUpdate = async () => {
    if (!selectedCommandeForPay || !selectedCommandeForPay.id) return;
    const newTot = Number(newTotalInput) || 0;
    const newAv = Number(newAvanceInput) || 0;
    const newReste = Math.max(0, newTot - newAv);

    const { error } = await supabase.from('commandes').update({
      montant_total: newTot,
      avance: newAv,
      reste: newReste
    }).eq('id', selectedCommandeForPay.id);

    if (!error) {
      setCommandes(prev => prev.map(item => item.id === selectedCommandeForPay.id
        ? { ...item, montant_total: newTot, avance: newAv, reste: newReste }
        : item
      ));
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

  const getMessageStatut = (c: Commande) => {
    const statut = c.statut || 'Reçue';
    const code = c.code_commande || '';
    const item = getItemName(c);

    if (statut === 'Reçue') {
      return `Votre commande ${code} (${item}) a bien été enregistrée à l'atelier. Nous démarrons la confection prochainement.`;
    } else if (statut === 'En Coupe') {
      return `Votre commande ${code} (${item}) est actuellement en cours de coupe et de confection à l'atelier.`;
    } else if (statut === 'Prête') {
      return `Bonne nouvelle ! Votre commande ${code} (${item}) est PRÊTE. Vous pouvez passer la récupérer à l'atelier.`;
    } else if (statut === 'Livrée') {
      return `Votre commande ${code} (${item}) vous a été livrée. Merci de votre confiance !`;
    }
    return `Statut de votre commande ${code} (${item}) : ${statut}.`;
  };

  // --- GÉNÈRE ET TÉLÉCHARGE LE PDF D'ALERTE (plein A4, filigrane, cachet & signature) ---
  const downloadAlertPDF = async (c: Commande) => {
    const { default: html2canvas } = await import('html2canvas-pro');
    const { default: jsPDF } = await import('jspdf');
    const element = alerteRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    pdf.save(`Alerte_${(c.client_nom || 'Client').replace(/\s+/g, '_')}_${c.code_commande || ''}.pdf`);
  };

  // Ouvre WhatsApp avec le message texte pré-rempli (comme avant, mais désormais précédé du PDF)
  const openWhatsAppAlert = (c: Commande) => {
    let cleanPhone = (c.client_tel || '').trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = '221' + cleanPhone;
    }

    const total = c.montant_total || 0;
    const avance = c.avance || 0;
    const reste = c.reste !== undefined ? c.reste : Math.max(0, total - avance);
    const clientName = (c.client_nom || 'Client').trim();

    const textMsg = `Bonjour ${clientName},\n\n${getMessageStatut(c)}\n\n` +
      `📌 *Récapitulatif financier* :\n` +
      `- Total : ${formatAmount(total)} FCFA\n` +
      `- Avance : ${formatAmount(avance)} FCFA\n` +
      `- Reste à payer : *${formatAmount(reste)} FCFA*\n\n` +
      `Le PDF de suivi a été téléchargé, n'hésitez pas à le joindre 📎.\n\n` +
      `Merci d'avoir choisi *Ousmane Design* !`;

    const encodedText = encodeURIComponent(textMsg);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  // Déclenche la séquence : rendre le template d'alerte -> générer le PDF -> ouvrir WhatsApp
  const handleAlertWhatsApp = (c: Commande) => {
    setSelectedCommandeForAlert(c);
    setPendingAlert(c);
  };

  useEffect(() => {
    if (!pendingAlert || !selectedCommandeForAlert || selectedCommandeForAlert.id !== pendingAlert.id) return;

    const timer = setTimeout(async () => {
      try {
        await downloadAlertPDF(pendingAlert);
      } catch (err) {
        console.error('Erreur génération PDF alerte :', err);
      }
      openWhatsAppAlert(pendingAlert);
      setPendingAlert(null);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAlert, selectedCommandeForAlert]);

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

  const getColonneStyle = (key: string) => {
    switch (key) {
      case 'Reçue': return { badge: 'bg-slate-100 text-slate-600' };
      case 'En Coupe': return { badge: 'text-white', bg: GOLD };
      case 'Prête': return { badge: 'text-white', bg: NAVY };
      case 'Livrée': return { badge: 'bg-emerald-100 text-emerald-700' };
      default: return { badge: 'bg-slate-100 text-slate-600' };
    }
  };

  const dateGeneration = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const statutCouleur = (statut: string) => {
    switch (statut) {
      case 'Reçue': return { bg: '#F1F5F9', fg: '#475569' };
      case 'En Coupe': return { bg: '#FBF3E2', fg: '#8A6A1E' };
      case 'Prête': return { bg: '#EAF1FB', fg: NAVY };
      case 'Livrée': return { bg: '#ECFDF5', fg: '#047857' };
      default: return { bg: '#F1F5F9', fg: '#475569' };
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F8FC' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-mono-tape { font-family: 'Space Mono', ui-monospace, monospace; }
        .stitch-line {
          height: 1px;
          background-image: repeating-linear-gradient(
            to right,
            ${GOLD} 0px,
            ${GOLD} 7px,
            transparent 7px,
            transparent 14px
          );
        }
      `}</style>

      {/* HEADER — bandeau navy premium, identique aux autres pages */}
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
                Ousmane Design — Pilotage de la production sur-mesure
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="font-body font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer shrink-0"
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              <Plus size={15} /> Nouvelle Commande
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10 pb-16 space-y-5 font-body">
        {/* RECHERCHE */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: NAVY, opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Rechercher par client, téléphone ou code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-full bg-slate-50 outline-none focus:ring-2 focus:bg-white text-slate-900 transition-colors"
              style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
            />
          </div>
        </div>

        {/* KANBAN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {columns.map(col => {
            const items = filteredCommandes.filter(c => (c.statut || 'Reçue') === col.key);
            const style = getColonneStyle(col.key);
            return (
              <div key={col.key} className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-display font-bold text-slate-800 text-sm">{col.title}</h2>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono-tape ${style.bg ? '' : style.badge}`}
                    style={style.bg ? { backgroundColor: style.bg, color: '#FFFFFF' } : undefined}
                  >
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
                        <div key={c.id} className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{c.client_nom || 'Client sans nom'}</h3>
                              <p className="text-xs text-slate-500">({c.client_tel || '-'})</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {c.code_commande && (
                                <span className="text-[10px] font-mono-tape font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: NAVY, color: '#FFFFFF' }}>
                                  {c.code_commande}
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteCommande(c)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                title="Supprimer la commande"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-700 font-medium">{getItemName(c)}</p>

                          {/* RECAP FINANCIER + PRIX MODIFIABLE */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 flex items-center gap-1">
                                Total: <strong className="text-slate-800 font-mono-tape">{formatAmount(total)} F</strong>
                                <button
                                  onClick={() => ouvrirModalPrix(c)}
                                  className="ml-0.5 p-1 rounded hover:bg-slate-200/70 text-slate-400 transition-colors cursor-pointer"
                                  title="Modifier le prix et/ou l'avance"
                                >
                                  <Pencil size={11} />
                                </button>
                              </span>
                              {isFullyPaid ? (
                                <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle size={10} /> PAYÉ (100%)
                                </span>
                              ) : (
                                <span className="font-bold font-mono-tape" style={{ color: ORANGE }}>Reste: {formatAmount(reste)} F</span>
                              )}
                            </div>

                            {!isFullyPaid && (
                              <div className="flex gap-1.5 pt-1">
                                <button
                                  onClick={() => handleSolderCommande(c)}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-1 rounded-full flex-1 transition-colors cursor-pointer"
                                >
                                  ✓ Solder (100%)
                                </button>
                                <button
                                  onClick={() => ouvrirModalPrix(c)}
                                  className="text-[10px] font-semibold px-2 py-1 rounded-full transition-colors cursor-pointer border"
                                  style={{ backgroundColor: '#F8FAFC', color: '#475569', borderColor: '#CBD5E1' }}
                                >
                                  Modifier
                                </button>
                              </div>
                            )}
                          </div>

                          {/* CHANGEMENT STATUT */}
                          <div className="pt-2 border-t border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Statut de fabrication
                            </label>
                            <select
                              value={c.statut || 'Reçue'}
                              onChange={(e) => c.id && handleUpdateStatut(c.id, e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 outline-none focus:ring-2 cursor-pointer"
                              style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                            >
                              {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>

                          {/* BOUTON ALERTE — PDF + WHATSAPP */}
                          <button
                            onClick={() => handleAlertWhatsApp(c)}
                            disabled={pendingAlert?.id === c.id}
                            className="w-full text-white text-xs font-bold px-3 py-2.5 rounded-full flex items-center justify-center gap-1.5 shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-60"
                            style={{ backgroundColor: '#059669' }}
                            title="Générer le PDF de suivi et alerter le client sur WhatsApp"
                          >
                            {pendingAlert?.id === c.id ? (
                              <><Loader2 size={14} className="animate-spin" /> Génération...</>
                            ) : (
                              <><Send size={14} /> Alerter le client</>
                            )}
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

      {/* MODAL MODIFICATION PRIX & PAIEMENT (fusionnés) */}
      {selectedCommandeForPay && (
        <div
          onClick={() => setSelectedCommandeForPay(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative border border-slate-200 space-y-4 font-body"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <CreditCard size={16} style={{ color: GOLD }} /> Modifier Prix & Paiement
              </h3>
              <button onClick={() => setSelectedCommandeForPay(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-semibold text-slate-800">{selectedCommandeForPay.client_nom}</p>

              <div>
                <label className="block font-semibold mt-1 mb-1">Montant Total (FCFA)</label>
                <input
                  type="number"
                  value={newTotalInput}
                  onChange={(e) => setNewTotalInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold font-mono-tape text-slate-900 focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
                <p className="text-[10px] text-slate-400 mt-1">Utile en cas de prix réduit/négocié pour ce client.</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Acompte / Avance versée (FCFA)</label>
                <input
                  type="number"
                  value={newAvanceInput}
                  onChange={(e) => setNewAvanceInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold font-mono-tape text-emerald-700 focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
              </div>

              <div className="rounded-lg p-2.5 flex justify-between items-center" style={{ backgroundColor: '#FBF3E2' }}>
                <span className="font-semibold" style={{ color: '#8A6A1E' }}>Reste à payer :</span>
                <span className="font-bold font-mono-tape" style={{ color: '#8A6A1E' }}>
                  {formatAmount(Math.max(0, (Number(newTotalInput) || 0) - (Number(newAvanceInput) || 0)))} FCFA
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCommandeForPay(null)}
                className="px-3.5 py-2 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePaymentUpdate}
                className="px-4 py-2 rounded-full text-white text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: '#059669' }}
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
              <h2 className="font-display text-lg font-bold text-slate-900">Nouvelle Commande</h2>
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.client_tel}
                    onChange={(e) => setFormData({ ...formData, client_tel: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
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
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Montant Total</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatAmount(montantTotalCalcul)} FCFA`}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 font-bold font-mono-tape text-slate-800"
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none text-emerald-600 font-bold font-mono-tape"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reste à payer</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatAmount(resteCalcul)} FCFA`}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-bold font-mono-tape"
                    style={{ backgroundColor: '#FBF3E2', color: '#8A6A1E' }}
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
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-200 text-slate-700 font-semibold cursor-pointer"
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

      {/* CONTENU CACHÉ POUR GÉNÉRATION DU PDF D'ALERTE — plein A4, filigrane, cachet & signature */}
      {selectedCommandeForAlert && (() => {
        const c = selectedCommandeForAlert;
        const total = Number(c.montant_total) || 0;
        const avance = Number(c.avance) || 0;
        const reste = c.reste !== undefined ? Math.max(0, c.reste) : Math.max(0, total - avance);
        const statut = c.statut || 'Reçue';
        const sc = statutCouleur(statut);
        const stepIndex = STATUTS.indexOf(statut) >= 0 ? STATUTS.indexOf(statut) : 0;

        return (
          <div
            ref={alerteRef}
            style={{ aspectRatio: '210 / 297' }}
            className="fixed top-0 left-[-10000px] w-[750px] bg-white text-slate-900 font-sans relative overflow-hidden flex flex-col"
          >
            {/* FILIGRANE */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
              style={{ zIndex: 0 }}
            >
              <span
                className="font-display italic font-bold whitespace-nowrap"
                style={{ fontSize: '92px', color: NAVY, opacity: 0.055, transform: 'rotate(-32deg)' }}
              >
                Ousmane Design
              </span>
            </div>

            {/* BANDEAU D'EN-TÊTE */}
            <div className="px-10 pt-10 pb-7 shrink-0 relative" style={{ backgroundColor: NAVY, zIndex: 1 }}>
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="font-display italic font-semibold text-4xl" style={{ color: '#FFFFFF' }}>Ousmane Design</h1>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] mt-2" style={{ color: GOLD }}>
                    Création & Couture Contemporaine
                  </p>
                  <div className="mt-5 space-y-1 text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <p className="flex items-center gap-1.5"><MapPin size={12} style={{ color: GOLD }} /> Hann Maristes, Dakar, Sénégal</p>
                    <p className="flex items-center gap-1.5"><Phone size={12} style={{ color: GOLD }} /> 77 646 21 02 / 70 348 26 82</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="inline-block text-[11px] font-bold px-4 py-2 rounded-full uppercase tracking-wider"
                    style={{ backgroundColor: GOLD, color: NAVY }}
                  >
                    Avis de Suivi de Commande
                  </span>
                  <p className="text-xs font-semibold mt-3" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Mis à jour le {dateGeneration}
                  </p>
                </div>
              </div>
            </div>

            <div className="stitch-line shrink-0 relative" style={{ zIndex: 1 }} />

            {/* CORPS */}
            <div className="flex-1 px-10 py-9 flex flex-col gap-8 relative" style={{ zIndex: 1 }}>
              {/* Identité client + commande */}
              <div className="flex justify-between items-start gap-6">
                <div className="border-l-2 pl-4" style={{ borderColor: GOLD }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Client</p>
                  <p className="font-display font-semibold text-slate-900 text-2xl mt-1">{c.client_nom || 'Sans nom'}</p>
                  <p className="text-xs text-slate-600 mt-1">{c.client_tel || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Commande</p>
                  <p className="font-mono-tape font-bold text-xl mt-1" style={{ color: NAVY }}>{c.code_commande || '-'}</p>
                  <p className="text-xs text-slate-600 mt-1">{getItemName(c)}</p>
                  <p className="text-[11px] font-bold mt-1" style={{ color: GOLD }}>
                    Quantité : {c.quantite ?? 1} article{(c.quantite ?? 1) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Stepper d'avancement */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-4">État d'avancement</p>
                <div className="flex items-center">
                  {STATUTS.map((s, idx) => {
                    const done = idx <= stepIndex;
                    return (
                      <React.Fragment key={s}>
                        <div className="flex flex-col items-center gap-1.5" style={{ width: 90 }}>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={done ? { backgroundColor: NAVY, color: '#FFFFFF' } : { backgroundColor: '#E2E8F0', color: '#94A3B8' }}
                          >
                            {idx + 1}
                          </div>
                          <span className="text-[9px] font-bold uppercase text-center" style={{ color: done ? NAVY : '#94A3B8' }}>
                            {s}
                          </span>
                        </div>
                        {idx < STATUTS.length - 1 && (
                          <div className="flex-1 h-0.5" style={{ backgroundColor: idx < stepIndex ? NAVY : '#E2E8F0' }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Badge statut actuel + message */}
              <div className="rounded-xl p-6 text-center" style={{ backgroundColor: sc.bg }}>
                <span
                  className="inline-block text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3"
                  style={{ backgroundColor: sc.fg, color: '#FFFFFF' }}
                >
                  {statut}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed max-w-md mx-auto">
                  {getMessageStatut(c)}
                </p>
              </div>

              {/* Récapitulatif financier */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-3">Récapitulatif financier</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg p-4" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <p className="text-[10px] font-semibold text-slate-500">Montant Total</p>
                    <p className="font-mono-tape text-lg font-bold mt-1" style={{ color: NAVY }}>{formatAmount(total)} F</p>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: '#ECFDF5', border: '1px solid #05966933' }}>
                    <p className="text-[10px] font-semibold" style={{ color: '#047857' }}>Avance Réglée</p>
                    <p className="font-mono-tape text-lg font-bold mt-1" style={{ color: '#047857' }}>{formatAmount(avance)} F</p>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: '#FBEAE3', border: `1px solid ${ORANGE}33` }}>
                    <p className="text-[10px] font-semibold" style={{ color: ORANGE }}>Reste à Payer</p>
                    <p className="font-mono-tape text-lg font-bold mt-1" style={{ color: ORANGE }}>{formatAmount(reste)} F</p>
                  </div>
                </div>
              </div>
            </div>

            {/* PIED DE PAGE — cachet & signature */}
            <div className="px-10 pb-10 pt-2 shrink-0 relative" style={{ zIndex: 1 }}>
              <div className="stitch-line mb-6" />
              <p className="text-center italic font-display text-xs text-slate-400 mb-4">
                Merci d'avoir choisi Ousmane Design pour votre élégance.
              </p>
              <div className="flex flex-col items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold text-center border-t pt-4" style={{ borderColor: '#E2E8F0' }}>
                <div className="relative h-24 flex items-center justify-center mb-1">
                  <img
                    src="/cachet-od.png"
                    alt="Cachet Ousmane Design"
                    className="absolute h-24 w-24 object-contain opacity-90"
                    style={{ left: '50%', transform: 'translateX(-60%) rotate(-6deg)' }}
                  />
                  <img
                    src="/signature.png"
                    alt="Signature Ousmane Design"
                    className="relative h-16 object-contain"
                    style={{ transform: 'translateX(25%)' }}
                  />
                </div>
                Ousmane Design (Signature & Cachet)
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
