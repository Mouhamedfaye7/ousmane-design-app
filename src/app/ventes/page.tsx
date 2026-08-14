'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Search, Printer, Share2, MapPin, Phone, Mail, 
  X, CheckCircle2, Download, Trash2, Package, ShoppingBag, PlusCircle, Receipt
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
  statut?: string;
  montant_total?: number;
  acompte?: number;
  mode_paiement?: string;
  notes?: string;
}

interface CatalogueItem {
  id: string;
  nom: string;
  categorie: string;
  prix: number;
  quantite_stock: number;
  tailles?: string[];
  couleurs?: string[];
}

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [commandesPending, setCommandesPending] = useState<Commande[]>([]);
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  
  // États pour la Facture Regroupée par Client
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [clientVentes, setClientVentes] = useState<Vente[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  
  const [importSearch, setImportSearch] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [formData, setFormData] = useState({
    commande_id: '',
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
  const resteCalcul = montantTotalCalcul - avanceNum;

  // Ouvrir la modal Vente Libérale
  const handleOpenVenteLiberale = () => {
    setFormData({
      commande_id: '',
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

  // Sélectionner une commande sur-mesure à solder
  const handleSelectCommandeToImport = (cmd: Commande) => {
    let total = Number(cmd.montant_total) || 0;
    const acompte = Number(cmd.acompte) || 0;

    if (total > 0 && total < 1000) total = total * 1000;

    setFormData({
      commande_id: cmd.id,
      article_id: '',
      client_nom: cmd.client_nom || '',
      client_tel: cmd.client_tel || '',
      mode_commande: 'Sur Mesure',
      mode_paiement: cmd.mode_paiement || 'Espèces',
      designation: cmd.modele || 'Commande Sur Mesure',
      quantite: '1',
      prix_unitaire: total.toString(),
      avance: total.toString(),
      observations: cmd.notes || `Solde de la commande #${cmd.id.slice(0, 5)}`
    });

    setShowImportModal(false);
    setShowAddModal(true);
  };

  // Sélectionner un article depuis le catalogue
  const handleSelectCatalogueItem = (item: CatalogueItem) => {
    let price = Number(item.prix) || 0;
    if (price > 0 && price < 1000) price = price * 1000;

    const priceStr = price > 0 ? price.toString() : '';

    setFormData({
      commande_id: '',
      article_id: item.id,
      client_nom: '',
      client_tel: '',
      mode_commande: 'Prêt-à-porter',
      mode_paiement: 'Espèces',
      designation: `${item.nom}${item.categorie ? ` (${item.categorie})` : ''}`,
      quantite: '1',
      prix_unitaire: priceStr,
      avance: priceStr,
      observations: `Achat article catalogue. Stock dispo: ${item.quantite_stock}`
    });

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
        await supabase.from('catalogue').update({ quantite_stock: nouveauStock }).eq('id', formData.article_id);
      }
    }

    if (formData.commande_id) {
      await supabase.from('commandes').update({ acompte: montantTotalCalcul, statut: 'Livrée' }).eq('id', formData.commande_id);
    }

    setShowAddModal(false);
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
    return v.designation || v.article || v.description || v.modele || 'Article catalogue';
  };

  // Liste des noms de clients uniques ayant au moins une vente
  const uniqueClients = Array.from(new Set(ventes.map(v => (v.client_nom || '').trim()).filter(Boolean)));

  // Générer la facture regroupée pour un client sélectionné
  const handleGenerateGroupedInvoice = (clientNom: string) => {
    const items = ventes.filter(v => (v.client_nom || '').trim().toLowerCase() === clientNom.trim().toLowerCase());
    if (items.length === 0) return;
    
    setClientVentes(items);
    setSelectedClientName(clientNom);
    setShowGroupModal(true);
  };

  // Partage PDF pour la Facture Regroupée
  const handleShareGroupedPDFWhatsApp = async () => {
    if (clientVentes.length === 0) return;
    setExporting(true);

    try {
      if (typeof window !== 'undefined') {
        const jsPDFModule = await import('jspdf');
        const autoTableModule = await import('jspdf-autotable');
        const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
        const autoTable = autoTableModule.default || autoTableModule;

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        let totalGeneral = 0;
        let totalAvance = 0;

        const tableBody = clientVentes.map(v => {
          let tot = v.montant_total || 0;
          let av = v.avance || 0;
          if (tot > 0 && tot < 1000) tot *= 1000;
          if (av > 0 && av < 1000) av *= 1000;
          totalGeneral += tot;
          totalAvance += av;

          return [
            getItemName(v),
            v.quantite || 1,
            `${formatAmount(v.prix_unitaire || tot)} FCFA`,
            `${formatAmount(tot)} FCFA`
          ];
        });

        const totalReste = Math.max(0, totalGeneral - totalAvance);
        const clientTel = clientVentes[0]?.client_tel || '-';
        const formattedDate = new Date().toLocaleDateString('fr-FR');

        doc.setLineWidth(0.8);
        doc.setDrawColor(217, 119, 6);
        doc.roundedRect(10, 10, 190, 277, 3, 3, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(120, 53, 15);
        doc.text('Ousmane Design', 16, 25);

        doc.setFontSize(8);
        doc.setTextColor(217, 119, 6);
        doc.text('CREATION & COUTURE CONTEMPORAINE (FACTURE REGROUPEE)', 16, 30);

        doc.setDrawColor(254, 215, 170);
        doc.setFillColor(255, 251, 235);
        doc.roundedRect(118, 15, 77, 24, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text('Hann Maristes, Dakar, Senegal', 127, 21.5);
        doc.text('77 646 21 02 / 70 348 26 82', 127, 27.5);
        doc.text('@ousmanedesign.sn', 127, 33.5);

        doc.setDrawColor(254, 215, 170);
        doc.setFillColor(255, 251, 235);
        doc.roundedRect(16, 45, 179, 22, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text('Client :', 20, 52);
        doc.text(`${selectedClientName}`, 40, 52);

        doc.text('Telephone :', 20, 58);
        doc.setTextColor(217, 119, 6);
        doc.text(`${clientTel}`, 40, 58);

        doc.setTextColor(30, 41, 59);
        doc.text('Date :', 120, 52);
        doc.text(`${formattedDate}`, 140, 52);
        doc.text('Nombre d\'articles :', 120, 58);
        doc.text(`${clientVentes.length}`, 155, 58);

        autoTable(doc, {
          startY: 72,
          margin: { left: 16, right: 15 },
          head: [['DESIGNATION ARTICLE', 'QTE', 'PRIX UNITAIRE', 'TOTAL']],
          body: tableBody,
          headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'right', cellWidth: 40 },
            3: { halign: 'right', cellWidth: 45, fontStyle: 'bold' }
          },
          bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59], fontStyle: 'bold' },
          theme: 'plain',
        });

        // @ts-ignore
        const finalY = (doc as any).lastAutoTable?.finalY || 110;

        const totalX = 110;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        doc.setTextColor(51, 65, 85);
        doc.text('TOTAL GLOBAL :', totalX, finalY + 14);
        doc.setTextColor(15, 23, 42);
        doc.text(`${formatAmount(totalGeneral)} FCFA`, 190, finalY + 14, { align: 'right' });

        doc.setTextColor(51, 65, 85);
        doc.text('TOTAL REGLÉ :', totalX, finalY + 23);
        doc.setTextColor(16, 185, 129);
        doc.text(`${formatAmount(totalAvance)} FCFA`, 190, finalY + 23, { align: 'right' });

        doc.setFillColor(217, 119, 6);
        doc.roundedRect(totalX - 2, finalY + 29, 83, 10, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('NET A PAYER :', totalX + 2, finalY + 35.5);
        doc.text(`${formatAmount(totalReste)} FCFA`, 188, finalY + 35.5, { align: 'right' });

        const safeName = selectedClientName.replace(/\s+/g, '_');
        doc.save(`Facture_Groupée_${safeName}.pdf`);
      }

      let cleanPhone = (clientVentes[0]?.client_tel || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

      let totalGeneral = clientVentes.reduce((acc, v) => acc + (v.montant_total || 0), 0);
      let totalAvance = clientVentes.reduce((acc, v) => acc + (v.avance || 0), 0);
      if (totalGeneral > 0 && totalGeneral < 1000) totalGeneral *= 1000;
      if (totalAvance > 0 && totalAvance < 1000) totalAvance *= 1000;
      const totalReste = Math.max(0, totalGeneral - totalAvance);

      const textMsg = `Bonjour ${selectedClientName},\n\nVoici le récapitulatif global de vos achats chez *Ousmane Design* (${clientVentes.length} article(s)) :\n` +
        `- Total Global : ${formatAmount(totalGeneral)} FCFA\n` +
        `- Total Encaissé : ${formatAmount(totalAvance)} FCFA\n` +
        `- Reste Global à Payer : ${formatAmount(totalReste)} FCFA\n\n` +
        `Votre facture regroupée en PDF a été générée. Merci pour votre confiance !`;

      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`
        : `https://wa.me/?text=${encodeURIComponent(textMsg)}`;

      window.open(waUrl, '_blank');

    } catch (err: any) {
      alert('Erreur génération PDF : ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const filteredVentes = ventes.filter(v =>
    (v.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.client_tel || '').includes(search) ||
    getItemName(v).toLowerCase().includes(search.toLowerCase())
  );

  const filteredCommandesToImport = commandesPending.filter(c =>
    (c.client_nom || '').toLowerCase().includes(importSearch.toLowerCase()) ||
    (c.client_tel || '').includes(importSearch) ||
    (c.modele || '').toLowerCase().includes(importSearch.toLowerCase())
  );

  const filteredCatalogue = catalogueItems.filter(item =>
    (item.nom || '').toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    (item.categorie || '').toLowerCase().includes(catalogueSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      {/* HEADER & EN-TÊTE DE BOUTONS */}
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

      {/* SÉLECTEUR DE FACTURE REGROUPÉE PAR CLIENT */}
      <div className="max-w-7xl mx-auto bg-amber-900/5 border border-amber-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-600 text-white p-2.5 rounded-lg">
            <Receipt size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Facture Regroupée par Client (Multi-articles)</h3>
            <p className="text-xs text-slate-500">Sélectionnez un client pour regrouper l'ensemble de ses achats sur une seule facture globale.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedClientName}
            onChange={(e) => setSelectedClientName(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
          >
            <option value="">-- Choisir un Client ({uniqueClients.length}) --</option>
            {uniqueClients.map((client, idx) => (
              <option key={idx} value={client}>{client}</option>
            ))}
          </select>

          <button
            onClick={() => handleGenerateGroupedInvoice(selectedClientName)}
            disabled={!selectedClientName}
            className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-lg shrink-0 cursor-pointer shadow-xs transition-colors"
          >
            Facture Globale
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

      {/* MODAL FACTURE REGROUPÉE MULTI-ARTICLES */}
      {showGroupModal && (
        <div
          onClick={() => setShowGroupModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative border border-slate-200 my-8"
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer size={15} /> Imprimer Tout
                </button>
                <button
                  onClick={handleShareGroupedPDFWhatsApp}
                  disabled={exporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Share2 size={15} /> {exporting ? 'Génération...' : 'WhatsApp (PDF Global)'}
                </button>
              </div>

              <button
                onClick={() => setShowGroupModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 border-2 border-amber-600/80 rounded-xl bg-white space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-amber-900 tracking-wide">Ousmane Design</h2>
                  <p className="text-[10px] uppercase font-bold text-amber-700 tracking-widest mt-0.5">
                    Création & Couture Contemporaine (Facture Globalisée)
                  </p>
                </div>

                <div className="border border-amber-200 bg-amber-50/50 p-3 rounded-lg text-xs text-slate-800 space-y-1.5 font-medium shadow-2xs">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-amber-600 shrink-0" />
                    <span>Hann Maristes, Dakar, Sénégal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-amber-600 shrink-0" />
                    <span>77 646 21 02 / 70 348 26 82</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border border-amber-200 rounded-lg p-3 bg-amber-50/30 text-xs">
                <div className="space-y-1">
                  <p><strong className="text-slate-900">Nom du client :</strong> <span className="font-bold text-slate-900">{selectedClientName}</span></p>
                  <p><strong className="text-slate-900">Téléphone :</strong> <span className="text-amber-700 font-bold">{clientVentes[0]?.client_tel || '-'}</span></p>
                </div>
                <div className="space-y-1">
                  <p><strong className="text-slate-900">Date d'édition :</strong> <span className="font-bold text-slate-800">{new Date().toLocaleDateString('fr-FR')}</span></p>
                  <p><strong className="text-slate-900">Total d'articles :</strong> <span className="font-bold text-amber-800">{clientVentes.length} article(s)</span></p>
                </div>
              </div>

              {/* TABLEAU DES ARTICLES GROUPÉS */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white font-bold uppercase">
                    <th className="p-2.5 rounded-tl-lg">Article / Désignation</th>
                    <th className="p-2.5 text-center">Qté</th>
                    <th className="p-2.5 text-right">P.U</th>
                    <th className="p-2.5 text-right rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 border-b border-amber-200">
                  {clientVentes.map((v, i) => {
                    let tot = v.montant_total || 0;
                    if (tot > 0 && tot < 1000) tot *= 1000;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{getItemName(v)}</td>
                        <td className="p-2.5 text-center font-bold">{v.quantite || 1}</td>
                        <td className="p-2.5 text-right font-semibold">{formatAmount(v.prix_unitaire || tot)} F</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatAmount(tot)} FCFA</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* RECAPITULATIF FINANCIER GLOBAL */}
              {(() => {
                let totGen = clientVentes.reduce((acc, c) => acc + (c.montant_total || 0), 0);
                let avGen = clientVentes.reduce((acc, c) => acc + (c.avance || 0), 0);
                if (totGen > 0 && totGen < 1000) totGen *= 1000;
                if (avGen > 0 && avGen < 1000) avGen *= 1000;
                const resteGen = Math.max(0, totGen - avGen);

                return (
                  <div className="flex justify-end text-xs">
                    <div className="w-64 space-y-1.5 text-right">
                      <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                        <span className="text-slate-700 font-bold">TOTAL GENERAL :</span>
                        <span className="font-bold text-slate-900">{formatAmount(totGen)} FCFA</span>
                      </div>
                      <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                        <span className="text-slate-700 font-bold">TOTAL ENCAISSÉ :</span>
                        <span className="font-bold text-emerald-600">{formatAmount(avGen)} FCFA</span>
                      </div>
                      <div className="flex justify-between py-1.5 px-2 bg-amber-600 text-white font-bold rounded-md">
                        <span>NET À PAYER :</span>
                        <span>{formatAmount(resteGen)} FCFA</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-6 grid grid-cols-2 gap-8 text-[11px] text-center font-bold text-slate-800">
                <div>
                  <p className="uppercase tracking-wider">SIGNATURE DU CLIENT</p>
                  <div className="mt-8 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <p className="uppercase tracking-wider">OUSMANE DESIGN (SIGNATURE & CACHET)</p>
                  <div className="mt-8 border-b border-dashed border-slate-300"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS SÉPARÉES (CATALOGUE, IMPORT ET ADD VENTE) */}
      {showCatalogueModal && (
        <div onClick={() => setShowCatalogueModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Vendre un article du Catalogue</h2>
                <p className="text-xs text-slate-500">Sélectionnez le modèle. Le stock sera déduit automatiquement à la validation.</p>
              </div>
              <button onClick={() => setShowCatalogueModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input type="text" placeholder="Rechercher dans le catalogue..." value={catalogueSearch} onChange={(e) => setCatalogueSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500 text-slate-900" />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredCatalogue.map((item) => (
                <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-amber-50/40 transition-colors">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 text-xs">{item.nom}</span>
                    <p className="text-[11px] text-slate-500">Prix : <strong className="text-amber-800">{formatAmount(item.prix)} FCFA</strong></p>
                  </div>
                  <button onClick={() => handleSelectCatalogueItem(item)} disabled={item.quantite_stock <= 0} className="bg-amber-700 hover:bg-amber-800 disabled:bg-slate-200 text-white font-bold text-xs px-3 py-2 rounded-lg cursor-pointer">
                    Choisir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div onClick={() => setShowImportModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Solder / Facturer une Commande</h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input type="text" placeholder="Rechercher par nom de client..." value={importSearch} onChange={(e) => setImportSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900" />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredCommandesToImport.map((cmd) => (
                <div key={cmd.id} className="p-3.5 flex items-center justify-between hover:bg-emerald-50/40 transition-colors">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{cmd.client_nom}</span>
                    <p className="text-[11px] text-slate-500">{cmd.modele || 'Commande sur mesure'}</p>
                  </div>
                  <button onClick={() => handleSelectCommandeToImport(cmd)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg cursor-pointer">
                    Solder
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 text-slate-900">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {formData.commande_id ? 'Solder & Générer Facture' : formData.mode_commande === 'Vente Libérale' ? 'Nouvelle Vente Libérale' : 'Vente Catalogue'}
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
                <input type="text" required value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none" />
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
                <button type="submit" className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold cursor-pointer">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FACTURE INDIVIDUELLE */}
      {selectedVente && (
        <div onClick={() => setSelectedVente(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 my-8">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <button onClick={() => window.print()} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Printer size={15} /> Imprimer
              </button>
              <button onClick={() => setSelectedVente(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 border-2 border-amber-600/80 rounded-xl bg-white space-y-6">
              <h2 className="text-2xl font-serif font-bold text-amber-900">Ousmane Design</h2>
              <p className="text-xs font-bold text-slate-800">Client : {selectedVente.client_nom}</p>
              <p className="text-xs text-slate-700">Article : {getItemName(selectedVente)} - Total : {formatAmount(selectedVente.montant_total)} FCFA</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
