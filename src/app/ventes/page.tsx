'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Printer, Share2, MapPin, Phone, Mail,
  X, CheckCircle2, Download, Trash2, Package, ShoppingBag, PlusCircle, CheckSquare, Square, Tag, Send, FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Vente {
  id?: string;
  client_nom: string;
  client_tel: string;
  created_at?: string;
  mode_commande?: string;
  mode_paiement?: string;
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
}

interface Commande {
  id: string;
  client_nom: string;
  client_tel: string;
  modele?: string;
  tissu?: string;
  couleur?: string;
  statut?: string;
  montant_total?: number;
  acompte?: number;
  mode_paiement?: string;
  notes?: string;
  created_at?: string;
}

interface CatalogueItem {
  id: string;
  nom: string;
  categorie: string;
  prix: number;
  quantite_stock: number;
  tailles?: string[] | string;
  couleurs?: string[] | string;
  taille?: string;
  couleur?: string;
  statut?: string;
}

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [commandesPending, setCommandesPending] = useState<Commande[]>([]);
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  
  const [selectedCatItem, setSelectedCatItem] = useState<CatalogueItem | null>(null);
  const [selectedTaille, setSelectedTaille] = useState<string>('');
  const [selectedCouleur, setSelectedCouleur] = useState<string>('');

  const [selectedCommandesIds, setSelectedCommandesIds] = useState<string[]>([]);
  const [importSearch, setImportSearch] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const invoiceRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    commande_ids: [] as string[],
    article_id: '',
    client_nom: '',
    client_tel: '',
    mode_commande: 'Vente Libérale',
    mode_paiement: 'Espèces',
    designation: '',
    quantite: '1',
    prix_unitaire: '',
    avance: '',
    observations: ''
  });

  const fetchVentes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ventes').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setVentes(data);
    }
    setLoading(false);
  };

  const fetchCommandesToImport = async () => {
    const { data, error } = await supabase.from('commandes').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setCommandesPending(data);
    }
  };

  const fetchCatalogue = async () => {
    const { data, error } = await supabase.from('catalogue').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setCatalogueItems(data);
    }
  };

  useEffect(() => {
    fetchVentes();
    fetchCommandesToImport();
    fetchCatalogue();
  }, []);

  const qtyNum = Number(formData.quantite) || 0;
  const puNum = Number(formData.prix_unitaire) || 0;
  const montantTotalCalcul = qtyNum * puNum;
  const avanceNum = Number(formData.avance) || 0;
  const resteCalcul = Math.max(0, montantTotalCalcul - avanceNum);

  const getCommandeDetails = (cmd: Commande) => {
    const parts = [];
    if (cmd.modele) parts.push(cmd.modele);
    if (cmd.tissu) parts.push(`Tissu: ${cmd.tissu}`);
    if (cmd.couleur) parts.push(`Couleur: ${cmd.couleur}`);
    if (cmd.notes) parts.push(`(${cmd.notes})`);
    return parts.length > 0 ? parts.join(' - ') : `Commande sur mesure #${cmd.id.slice(0, 5)}`;
  };

  const formatCatalogueDetails = (item: CatalogueItem) => {
    const details = [];
    if (item.categorie) details.push(`Catégorie: ${item.categorie}`);
    if (item.taille) details.push(`Taille: ${item.taille}`);
    else if (Array.isArray(item.tailles) && item.tailles.length > 0) details.push(`Tailles: ${item.tailles.join(', ')}`);
    else if (typeof item.tailles === 'string' && item.tailles) details.push(`Taille: ${item.tailles}`);

    if (item.couleur) details.push(`Couleur: ${item.couleur}`);
    else if (Array.isArray(item.couleurs) && item.couleurs.length > 0) details.push(`Couleurs: ${item.couleurs.join(', ')}`);
    else if (typeof item.couleurs === 'string' && item.couleurs) details.push(`Couleur: ${item.couleurs}`);

    return details.join(' | ');
  };

  const handleOpenVenteLiberale = () => {
    setFormData({
      commande_ids: [],
      article_id: '',
      client_nom: '',
      client_tel: '',
      mode_commande: 'Vente Libérale',
      mode_paiement: 'Espèces',
      designation: '',
      quantite: '1',
      prix_unitaire: '',
      avance: '',
      observations: ''
    });
    setShowAddModal(true);
  };

  const toggleSelectCommande = (cmdId: string) => {
    if (selectedCommandesIds.includes(cmdId)) {
      setSelectedCommandesIds(selectedCommandesIds.filter(id => id !== cmdId));
    } else {
      setSelectedCommandesIds([...selectedCommandesIds, cmdId]);
    }
  };

  const handleConfirmImportCommandes = () => {
    const selectedCmds = commandesPending.filter(c => selectedCommandesIds.includes(c.id));
    if (selectedCmds.length === 0) return;

    const firstClient = selectedCmds[0];
    if (selectedCmds.length === 1) {
      const cmd = selectedCmds[0];
      let total = Number(cmd.montant_total) || 0;
      if (total > 0 && total < 1000) total *= 1000;

      setFormData({
        commande_ids: [cmd.id],
        article_id: '',
        client_nom: cmd.client_nom || '',
        client_tel: cmd.client_tel || '',
        mode_commande: 'Sur Mesure',
        mode_paiement: cmd.mode_paiement || 'Espèces',
        designation: getCommandeDetails(cmd),
        quantite: '1',
        prix_unitaire: total.toString(),
        avance: total.toString(),
        observations: `Solde Commande Sur-Mesure #${cmd.id.slice(0, 5)}`
      });
    } else {
      let totalSum = 0;
      const combinedDesignations: string[] = [];

      selectedCmds.forEach(cmd => {
        let tot = Number(cmd.montant_total) || 0;
        if (tot > 0 && tot < 1000) tot *= 1000;
        totalSum += tot;
        combinedDesignations.push(getCommandeDetails(cmd));
      });

      setFormData({
        commande_ids: selectedCmds.map(c => c.id),
        article_id: '',
        client_nom: firstClient.client_nom || '',
        client_tel: firstClient.client_tel || '',
        mode_commande: 'Sur Mesure (Groupé)',
        mode_paiement: 'Espèces',
        designation: combinedDesignations.join(' | '),
        quantite: '1',
        prix_unitaire: totalSum.toString(),
        avance: totalSum.toString(),
        observations: `Solde groupé de ${selectedCmds.length} commande(s)`
      });
    }

    setShowImportModal(false);
    setShowAddModal(true);
  };

  const handlePrepareCatalogueItem = (item: CatalogueItem) => {
    setSelectedCatItem(item);
    if (item.taille) setSelectedTaille(item.taille);
    else if (Array.isArray(item.tailles) && item.tailles.length > 0) setSelectedTaille(item.tailles[0]);
    else setSelectedTaille('');

    if (item.couleur) setSelectedCouleur(item.couleur);
    else if (Array.isArray(item.couleurs) && item.couleurs.length > 0) setSelectedCouleur(item.couleurs[0]);
    else setSelectedCouleur('');
  };

  const handleConfirmCatalogueItem = () => {
    if (!selectedCatItem) return;
    const item = selectedCatItem;

    let price = Number(item.prix) || 0;
    if (price > 0 && price < 1000) price = price * 1000;
    const priceStr = price > 0 ? price.toString() : '';

    const specParts = [];
    if (selectedTaille) specParts.push(`Taille: ${selectedTaille}`);
    if (selectedCouleur) specParts.push(`Couleur: ${selectedCouleur}`);
    const specsStr = specParts.length > 0 ? ` (${specParts.join(', ')})` : '';

    setFormData({
      commande_ids: [],
      article_id: item.id,
      client_nom: '',
      client_tel: '',
      mode_commande: 'Prêt-à-porter',
      mode_paiement: 'Espèces',
      designation: `${item.nom}${specsStr}`,
      quantite: '1',
      prix_unitaire: priceStr,
      avance: priceStr,
      observations: `Achat Catalogue - ${item.categorie || 'Prêt-à-porter'}`
    });

    setSelectedCatItem(null);
    setShowCatalogueModal(false);
    setShowAddModal(true);
  };

  const handleCreateVente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_nom || !formData.designation) {
      alert('Veuillez remplir le nom du client et la désignation.');
      return;
    }

    const payload = {
      client_nom: formData.client_nom,
      client_tel: formData.client_tel,
      mode_commande: formData.mode_commande,
      mode_paiement: formData.mode_paiement,
      designation: formData.designation,
      quantite: qtyNum || 1,
      prix_unitaire: puNum,
      montant_total: montantTotalCalcul,
      avance: avanceNum,
      reste: resteCalcul,
      observations: formData.observations
    };

    const { error } = await supabase.from('ventes').insert([payload]);

    if (error) {
      console.error('Erreur Supabase Ventes:', error);
      const fallbackPayload = {
        client_nom: formData.client_nom,
        client_tel: formData.client_tel,
        montant_total: montantTotalCalcul,
        avance: avanceNum,
        observations: `[${formData.designation}] Qté: ${qtyNum} x ${puNum} FCFA - Reste: ${resteCalcul} FCFA | ${formData.observations}`.trim()
      };
      await supabase.from('ventes').insert([fallbackPayload]);
    }

    if (formData.article_id) {
      const { data: catItem } = await supabase.from('catalogue').select('quantite_stock').eq('id', formData.article_id).single();
      if (catItem) {
        const nouveauStock = Math.max(0, Number(catItem.quantite_stock) - qtyNum);
        const updatePayload: any = { quantite_stock: nouveauStock };
        if (nouveauStock === 0) {
          updatePayload.statut = 'Vendu';
        }
        await supabase.from('catalogue').update(updatePayload).eq('id', formData.article_id);
      }
    }

    if (formData.commande_ids && formData.commande_ids.length > 0) {
      for (const cmdId of formData.commande_ids) {
        await supabase.from('commandes').update({ statut: 'Soldée' }).eq('id', cmdId);
      }
    }

    setShowAddModal(false);
    setSelectedCommandesIds([]);
    fetchVentes();
    fetchCommandesToImport();
    fetchCatalogue();
  };

  const handleDeleteVente = async (id?: string, clientNom?: string) => {
    if (!id) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la vente de "${clientNom || 'ce client'}" ?`)) return;

    const { error } = await supabase.from('ventes').delete().eq('id', id);
    if (!error) fetchVentes();
  };

  const formatAmount = (val: number | undefined | null) => {
    let num = Number(val) || 0;
    if (num > 0 && num < 1000) num = num * 1000;
    return num.toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  const getItemName = (v: Vente) => {
    return v.designation || v.article || v.description || v.modele || 'Article sur mesure';
  };

  // GENERATION ET TELECHARGEMENT DE FACTURE EN PDF
  const handleDownloadPDF = async (v: Vente) => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = invoiceRef.current;
      if (!element) return;

      const opt = {
        margin:       10,
        filename:     `Facture_${(v.client_nom || 'Client').replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.warn('Fallback impression PDF :', err);
      window.print();
    }
  };

  const handleSendWhatsAppInvoice = (v: Vente) => {
    let cleanPhone = (v.client_tel || '').trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = '221' + cleanPhone;
    }

    let total = v.montant_total || 0;
    let avance = v.avance || 0;
    if (total > 0 && total < 1000) total *= 1000;
    if (avance > 0 && avance < 1000) avance *= 1000;
    const reste = v.reste !== undefined ? v.reste : (total - avance);
    const clientName = (v.client_nom || 'Client').trim();

    const textMsg = `*OUSMANE DESIGN - FACTURE DE VENTE*\n\n` +
      `Bonjour ${clientName},\n` +
      `Voici le récapitulatif de votre facture :\n\n` +
      `📌 *Article / Désignation* : ${getItemName(v)}\n` +
      `💳 *Mode de règlement* : ${v.mode_paiement || 'Espèces'}\n\n` +
      `💰 *Montant Total* : ${formatAmount(total)} FCFA\n` +
      `✅ *Montant Réglé* : ${formatAmount(avance)} FCFA\n` +
      `🔹 *Reste à payer* : *${formatAmount(reste)} FCFA*\n\n` +
      `Merci d'avoir choisi *Ousmane Design* !\n` +
      `📍 Hann Maristes, Dakar, Sénégal | 📞 77 646 21 02 / 70 348 26 82`;

    const encodedText = encodeURIComponent(textMsg);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  const filteredVentes = ventes.filter(v =>
    (v.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.client_tel || '').includes(search) ||
    getItemName(v).toLowerCase().includes(search.toLowerCase())
  );

  const filteredCommandesToImport = commandesPending.filter(c =>
    (c.client_nom || '').toLowerCase().includes(importSearch.toLowerCase()) ||
    (c.client_tel || '').includes(importSearch) ||
    getCommandeDetails(c).toLowerCase().includes(importSearch.toLowerCase())
  );

  const filteredCatalogue = catalogueItems.filter(item =>
    (item.nom || '').toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    (item.categorie || '').toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    formatCatalogueDetails(item).toLowerCase().includes(catalogueSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2 font-semibold">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Ventes & Factures</h1>
          <p className="text-sm font-medium text-slate-500">Ousmane Design — Enregistrement, facturation et encaissement</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenVenteLiberale}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer text-xs"
          >
            <PlusCircle size={16} /> Vente Libérale
          </button>

          <button
            onClick={() => setShowCatalogueModal(true)}
            className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-3.5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer text-xs"
          >
            <Package size={16} /> Vendre du Catalogue
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer text-xs"
          >
            <Download size={16} /> Solder une Commande
          </button>
        </div>
      </div>

      {/* TABLEAU DES VENTRES */}
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher une facture ou un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <th className="p-3">Client</th>
                <th className="p-3">Téléphone</th>
                <th className="p-3">Désignation</th>
                <th className="p-3">Total</th>
                <th className="p-3">Réglé</th>
                <th className="p-3">Reste</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Chargement...</td></tr>
              ) : filteredVentes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Aucune vente enregistrée.</td></tr>
              ) : filteredVentes.map((v) => {
                let total = v.montant_total || 0;
                let avance = v.avance || 0;
                if (total > 0 && total < 1000) total = total * 1000;
                if (avance > 0 && avance < 1000) avance = avance * 1000;
                const reste = v.reste !== undefined ? v.reste : (total - avance);

                return (
                  <tr key={v.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{v.client_nom}</td>
                    <td className="p-3 text-slate-500">{v.client_tel || '-'}</td>
                    <td className="p-3 text-slate-700">{getItemName(v)}</td>
                    <td className="p-3 font-bold text-slate-900">{formatAmount(total)} FCFA</td>
                    <td className="p-3 text-emerald-600 font-semibold">{formatAmount(avance)} FCFA</td>
                    <td className="p-3 font-bold text-amber-600">{formatAmount(reste)} FCFA</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedVente(v)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-md shadow-xs transition-colors cursor-pointer"
                          title="Voir / Imprimer Facture"
                        >
                          Facture
                        </button>
                        <button
                          onClick={() => handleSendWhatsAppInvoice(v)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-md transition-colors cursor-pointer"
                          title="Envoyer sur WhatsApp"
                        >
                          <Send size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteVente(v.id, v.client_nom)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Supprimer la vente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CATALOGUE */}
      {showCatalogueModal && (
        <div onClick={() => { setShowCatalogueModal(false); setSelectedCatItem(null); }} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Vendre un article du Catalogue</h2>
                <p className="text-xs text-slate-500">Sélectionnez le modèle. Le stock sera déduit automatiquement à la validation.</p>
              </div>
              <button onClick={() => { setShowCatalogueModal(false); setSelectedCatItem(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input type="text" placeholder="Rechercher par nom, catégorie, taille ou couleur..." value={catalogueSearch} onChange={(e) => setCatalogueSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500 text-slate-900" />
            </div>

            {!selectedCatItem ? (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredCatalogue.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">Aucun article trouvé dans le catalogue.</p>
                ) : filteredCatalogue.map((item) => {
                  const isVendu = item.quantite_stock <= 0 || item.statut === 'Vendu';
                  const detailsText = formatCatalogueDetails(item);

                  return (
                    <div key={item.id} className={`p-3.5 flex items-center justify-between transition-colors ${isVendu ? 'bg-slate-50 opacity-75' : 'hover:bg-amber-50/40'}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{item.nom}</span>
                          {isVendu ? (
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                              <Tag size={10} /> VENDU
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Stock : {item.quantite_stock}
                            </span>
                          )}
                        </div>

                        {detailsText && (
                          <p className="text-[11px] text-slate-600 font-medium">
                            {detailsText}
                          </p>
                        )}

                        <p className="text-[11px] text-amber-800 font-bold">
                          Prix : {formatAmount(item.prix)} FCFA
                        </p>
                      </div>

                      <button
                        onClick={() => handlePrepareCatalogueItem(item)}
                        disabled={isVendu}
                        className="bg-amber-700 hover:bg-amber-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0"
                      >
                        {isVendu ? 'Épuisé' : 'Choisir'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{selectedCatItem.nom}</h3>
                    <p className="text-xs text-amber-800 font-bold">{formatAmount(selectedCatItem.prix)} FCFA</p>
                  </div>
                  <button onClick={() => setSelectedCatItem(null)} className="text-xs text-slate-500 underline cursor-pointer">Changer d'article</button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Taille sélectionnée :</label>
                    {Array.isArray(selectedCatItem.tailles) && selectedCatItem.tailles.length > 0 ? (
                      <select value={selectedTaille} onChange={(e) => setSelectedTaille(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold">
                        {selectedCatItem.tailles.map((t, i) => (
                          <option key={i} value={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={selectedTaille} onChange={(e) => setSelectedTaille(e.target.value)} placeholder="Ex: XL, L, 42..." className="w-full p-2 border border-slate-300 rounded-lg bg-white" />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Couleur sélectionnée :</label>
                    {Array.isArray(selectedCatItem.couleurs) && selectedCatItem.couleurs.length > 0 ? (
                      <select value={selectedCouleur} onChange={(e) => setSelectedCouleur(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold">
                        {selectedCatItem.couleurs.map((c, i) => (
                          <option key={i} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={selectedCouleur} onChange={(e) => setSelectedCouleur(e.target.value)} placeholder="Ex: Bleu Nuit, Blanc..." className="w-full p-2 border border-slate-300 rounded-lg bg-white" />
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setSelectedCatItem(null)} className="px-3.5 py-2 rounded-lg bg-slate-200 text-xs font-bold cursor-pointer">Retour</button>
                  <button onClick={handleConfirmCatalogueItem} className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold cursor-pointer">Valider la sélection</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SOLDER COMMANDE */}
      {showImportModal && (
        <div onClick={() => setShowImportModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Solder des Commandes Sur-Mesure</h2>
                <p className="text-xs text-slate-500">Sélectionnez une ou plusieurs commandes du même client pour les solder et générer une facture unique.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher par nom de client, modèle ou détail..."
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl mb-4">
              {filteredCommandesToImport.map((cmd) => {
                const isSelected = selectedCommandesIds.includes(cmd.id);
                const isSoldee = cmd.statut === 'Soldée' || cmd.statut === 'Livrée';
                let total = cmd.montant_total || 0;
                if (total > 0 && total < 1000) total *= 1000;

                return (
                  <div
                    key={cmd.id}
                    onClick={() => !isSoldee && toggleSelectCommande(cmd.id)}
                    className={`p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-emerald-600 shrink-0">
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300" />}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{cmd.client_nom}</span>
                          {isSoldee && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Déjà Soldée
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-700 font-medium">
                          {getCommandeDetails(cmd)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-900 text-xs">{formatAmount(total)} FCFA</span>
                      <p className="text-[10px] text-slate-400">Tel: {cmd.client_tel || '-'}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-600">
                {selectedCommandesIds.length} article(s) sélectionné(s)
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 font-bold text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImportCommandes}
                  disabled={selectedCommandesIds.length === 0}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
                >
                  Solder & Générer Facture ({selectedCommandesIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULAIRE DE VENTE */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 text-slate-900">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {formData.commande_ids.length > 0 ? 'Solder & Générer Facture' : formData.mode_commande === 'Vente Libérale' ? 'Nouvelle Vente Libérale' : 'Vente Catalogue'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateVente} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom du client *</label>
                  <input type="text" required value={formData.client_nom} onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })} className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
                  <input type="text" value={formData.client_tel} onChange={(e) => setFormData({ ...formData, client_tel: e.target.value })} className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Désignation / Article *</label>
                <textarea required rows={2} value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantité</label>
                  <input type="number" min="1" value={formData.quantite} onChange={(e) => setFormData({ ...formData, quantite: e.target.value })} className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix Unitaire</label>
                  <input type="number" min="0" value={formData.prix_unitaire} onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })} className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant Total</label>
                  <input type="text" readOnly value={`${formatAmount(montantTotalCalcul)} FCFA`} className="w-full p-2 border border-slate-200 rounded-md bg-slate-100 font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant Encaissé</label>
                  <input type="number" min="0" value={formData.avance} onChange={(e) => setFormData({ ...formData, avance: e.target.value })} className="w-full p-2 border border-slate-300 rounded-md bg-white text-emerald-600 font-bold outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reste à payer</label>
                  <input type="text" readOnly value={`${formatAmount(resteCalcul)} FCFA`} className="w-full p-2 border border-slate-200 rounded-md bg-amber-50 text-amber-700 font-bold" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg bg-slate-200 font-bold cursor-pointer">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold cursor-pointer">Enregistrer la vente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FACTURE AVEC TÉLÉCHARGEMENT PDF & IMPRESSION */}
      {selectedVente && (() => {
        let total = selectedVente.montant_total || 0;
        let avance = selectedVente.avance || 0;
        if (total > 0 && total < 1000) total *= 1000;
        if (avance > 0 && avance < 1000) avance *= 1000;
        const reste = selectedVente.reste !== undefined ? selectedVente.reste : (total - avance);
        const qte = selectedVente.quantite || 1;
        const pu = selectedVente.prix_unitaire || (total / qte);
        const dateFormatted = selectedVente.created_at ? new Date(selectedVente.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');

        return (
          <div onClick={() => setSelectedVente(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 my-8">
              
              {/* BOUTONS D'ACTION (Masqués lors de l'impression) */}
              <div className="flex justify-between items-center mb-4 border-b pb-3 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleDownloadPDF(selectedVente)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileText size={15} /> Télécharger PDF
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer size={15} /> Imprimer
                  </button>

                  <button
                    onClick={() => handleSendWhatsAppInvoice(selectedVente)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send size={15} /> WhatsApp
                  </button>
                </div>

                <button onClick={() => setSelectedVente(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              {/* CONTENU FACTURE CIBLÉ POUR EXPORT PDF */}
              <div ref={invoiceRef} className="p-6 border-2 border-amber-800/20 rounded-xl bg-white space-y-5 text-slate-900 font-sans">
                {/* EN-TÊTE ATELIER */}
                <div className="flex justify-between items-start border-b border-amber-900/20 pb-4">
                  <div>
                    <h2 className="text-2xl font-serif font-extrabold text-amber-900 tracking-wide">Ousmane Design</h2>
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Création & Couture Contemporaine</p>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1"><MapPin size={12} className="text-amber-800" /> Hann Maristes, Dakar, Sénégal</p>
                    <p className="text-xs text-slate-600 flex items-center gap-1"><Phone size={12} className="text-amber-800" /> 77 646 21 02 / 70 348 26 82</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-amber-900 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider">Facture</span>
                    <p className="text-xs font-semibold text-slate-500 mt-2">Date : {dateFormatted}</p>
                  </div>
                </div>

                {/* CLIENT ET PAIEMENT */}
                <div className="grid grid-cols-2 gap-4 bg-amber-50/50 p-3.5 rounded-lg border border-amber-100 text-xs">
                  <div>
                    <p className="text-slate-500 font-medium">Client :</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedVente.client_nom}</p>
                    <p className="text-slate-600">Tél : {selectedVente.client_tel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Détails de règlement :</p>
                    <p className="font-semibold text-slate-800">Mode de commande : <span className="font-bold">{selectedVente.mode_commande || 'Sur Mesure'}</span></p>
                    <p className="font-semibold text-slate-800">Mode de paiement : <span className="font-bold">{selectedVente.mode_paiement || 'Espèces'}</span></p>
                  </div>
                </div>

                {/* TABLEAU ARTICLES */}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-amber-900 text-white font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Désignation</th>
                        <th className="p-2.5 text-center">Quantité</th>
                        <th className="p-2.5 text-right">Prix Unitaire</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2.5 font-medium text-slate-800">{getItemName(selectedVente)}</td>
                        <td className="p-2.5 text-center font-bold text-slate-700">{qte}</td>
                        <td className="p-2.5 text-right font-medium text-slate-700">{formatAmount(pu)} FCFA</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatAmount(total)} FCFA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* OBSERVATIONS */}
                {selectedVente.observations && (
                  <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="font-bold text-slate-700">Observations : </span>
                    <span className="text-slate-600">{selectedVente.observations}</span>
                  </div>
                )}

                {/* TOTAL */}
                <div className="flex justify-end pt-1 text-xs">
                  <div className="w-64 space-y-1.5 border-t-2 border-amber-900/20 pt-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Montant Total :</span>
                      <strong className="text-slate-900">{formatAmount(total)} FCFA</strong>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Montant Réglé :</span>
                      <strong>{formatAmount(avance)} FCFA</strong>
                    </div>
                    <div className="flex justify-between text-amber-800 font-bold border-t border-slate-200 pt-1 text-sm">
                      <span>Reste à Payer :</span>
                      <span>{formatAmount(reste)} FCFA</span>
                    </div>
                  </div>
                </div>

                {/* BAS DE PAGE */}
                <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 pt-8 border-t border-slate-200 uppercase font-bold text-center">
                  <div>Signature du client</div>
                  <div>Ousmane Design (Signature & Cachet)</div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
