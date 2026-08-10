'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Printer, Share2, MapPin, Phone, Mail, X } from 'lucide-react';
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
  montant_total: number;
  avance: number;
  reste: number;
  observations?: string;
}

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [search, setSearch] = useState('');
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Formulaire nouvelle vente
  const [formData, setFormData] = useState({
    client_nom: '',
    client_tel: '',
    mode_commande: 'Prêt-à-porter',
    mode_paiement: 'Espèces',
    designation: '',
    quantite: 1,
    prix_unitaire: 0,
    montant_total: 0,
    avance: 0,
    reste: 0,
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

  useEffect(() => {
    fetchVentes();
  }, []);

  // Calcul automatique du total et reste
  const handleFormChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    const qty = Number(updated.quantite) || 1;
    const pu = Number(updated.prix_unitaire) || 0;
    const total = qty * pu;
    const av = Number(updated.avance) || 0;
    
    updated.montant_total = total;
    updated.reste = total - av;

    setFormData(updated);
  };

  const handleCreateVente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_nom || !formData.designation) {
      alert('Veuillez remplir le nom du client et la désignation.');
      return;
    }

    // Construction d'un objet incluant les variantes courantes de colonnes pour 'designation'
    const payload: Record<string, any> = {
      client_nom: formData.client_nom,
      client_tel: formData.client_tel,
      mode_commande: formData.mode_commande,
      mode_paiement: formData.mode_paiement,
      quantite: formData.quantite,
      prix_unitaire: formData.prix_unitaire,
      montant_total: formData.montant_total,
      avance: formData.avance,
      reste: formData.reste,
      observations: formData.observations,
      // On envoie designation, article, description et modele pour être sûr de matcher la colonne Supabase
      designation: formData.designation,
      article: formData.designation,
      description: formData.designation,
      modele: formData.designation
    };

    let { error } = await supabase.from('ventes').insert([payload]);

    // Si Supabase rejette en raison de colonnes inconnues, tentative avec payload restreint
    if (error) {
      console.warn('Tentative d insertion alternative sans colonnes optionnelles...', error.message);
      
      const fallbackPayload = {
        client_nom: formData.client_nom,
        client_tel: formData.client_tel,
        montant_total: formData.montant_total,
        avance: formData.avance,
        reste: formData.reste,
        observations: `${formData.designation} (${formData.quantite}x) - ${formData.observations}`
      };

      const fallbackRes = await supabase.from('ventes').insert([fallbackPayload]);
      error = fallbackRes.error;
    }

    if (error) {
      alert('Erreur lors de l\'enregistrement de la vente : ' + error.message);
    } else {
      setShowAddModal(false);
      setFormData({
        client_nom: '',
        client_tel: '',
        mode_commande: 'Prêt-à-porter',
        mode_paiement: 'Espèces',
        designation: '',
        quantite: 1,
        prix_unitaire: 0,
        montant_total: 0,
        avance: 0,
        reste: 0,
        observations: ''
      });
      fetchVentes();
    }
  };

  const formatAmount = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString('fr-FR');
  };

  const getItemName = (v: Vente) => {
    return v.designation || v.article || v.description || v.modele || 'Article sur mesure';
  };

  // Génération PDF
  const handleSharePDFWhatsApp = async () => {
    if (!selectedVente) return;
    setExporting(true);

    try {
      if (typeof window !== 'undefined') {
        const jsPDFModule = await import('jspdf');
        const autoTableModule = await import('jspdf-autotable');
        const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
        const autoTable = autoTableModule.default || autoTableModule;

        const doc = new jsPDF();

        // En-tête Ousmane Design
        doc.setFontSize(22);
        doc.setTextColor(180, 83, 9);
        doc.text('Ousmane Design', 14, 20);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text('CREATION & COUTURE CONTEMPORAINE', 14, 25);

        // Coordonnées
        doc.setFontSize(9);
        doc.setTextColor(50);
        doc.text('Hann Maristes, Dakar, Senegal', 130, 18);
        doc.text('Tel: 77 646 21 02 / 70 348 26 82', 130, 23);
        doc.text('Email: @ousmanedesign.sn', 130, 28);

        doc.setLineWidth(0.5);
        doc.setDrawColor(217, 119, 6);
        doc.line(14, 33, 196, 33);

        const formattedDate = selectedVente.created_at 
          ? new Date(selectedVente.created_at).toLocaleDateString('fr-FR')
          : new Date().toLocaleDateString('fr-FR');

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Client : ${selectedVente.client_nom || 'Client'}`, 14, 43);
        doc.text(`Telephone : ${selectedVente.client_tel || 'N/A'}`, 14, 49);
        doc.text(`Date : ${formattedDate}`, 14, 55);

        doc.text(`Mode de commande : ${selectedVente.mode_commande || 'Pret-a-porter'}`, 120, 43);
        doc.text(`Mode de paiement : ${selectedVente.mode_paiement || 'Especes'}`, 120, 49);

        // Tableau
        autoTable(doc, {
          startY: 63,
          head: [['Designation', 'Quantite', 'Prix Unitaire', 'Total']],
          body: [
            [
              getItemName(selectedVente),
              selectedVente.quantite || 1,
              `${formatAmount(selectedVente.prix_unitaire || selectedVente.montant_total)} FCFA`,
              `${formatAmount(selectedVente.montant_total)} FCFA`
            ]
          ],
          headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
          theme: 'striped',
        });

        // @ts-ignore
        const finalY = (doc as any).lastAutoTable?.finalY || 100;

        // Récapitulatif Financier
        doc.setFontSize(10);
        doc.text(`Montant Total : ${formatAmount(selectedVente.montant_total)} FCFA`, 120, finalY + 10);
        doc.text(`Avance Versee : ${formatAmount(selectedVente.avance)} FCFA`, 120, finalY + 16);
        doc.setFontSize(11);
        doc.setTextColor(217, 119, 6);
        doc.text(`Reste a payer : ${formatAmount(selectedVente.reste)} FCFA`, 120, finalY + 23);

        // Observations
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Observations : ${selectedVente.observations || 'Articles livres en parfait etat.'}`, 14, finalY + 10);

        // Signatures
        doc.setTextColor(0);
        doc.setFontSize(9);
        doc.text('Signature Client :', 25, finalY + 45);
        doc.text('Ousmane Design (Signature & Cachet) :', 110, finalY + 45);

        const safeName = (selectedVente.client_nom || 'Client').replace(/\s+/g, '_');
        doc.save(`Facture_${safeName}.pdf`);
      }

      let cleanPhone = (selectedVente.client_tel || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

      const textMsg = `Bonjour ${selectedVente.client_nom},\n\nVoici votre facture de chez *Ousmane Design* :\n` +
        `- Article : ${getItemName(selectedVente)}\n` +
        `- Total : ${formatAmount(selectedVente.montant_total)} FCFA\n` +
        `- Avance : ${formatAmount(selectedVente.avance)} FCFA\n` +
        `- Reste : ${formatAmount(selectedVente.reste)} FCFA\n\n` +
        `Le fichier PDF de votre facture a ete telecharge. Merci pour votre confiance !`;

      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`
        : `https://wa.me/?text=${encodeURIComponent(textMsg)}`;

      window.open(waUrl, '_blank');

    } catch (err: any) {
      console.error('Erreur génération PDF:', err);
      alert('Erreur lors de la génération du PDF : ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredVentes = ventes.filter(v =>
    (v.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.client_tel || '').includes(search) ||
    getItemName(v).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      
      {/* En-tête */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Ventes & Factures</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Historique et enregistrement</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors self-start md:self-auto"
        >
          <Plus size={18} /> Enregistrer une vente / Article
        </button>
      </div>

      {/* Tableau des ventes */}
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher par client, téléphone, article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="p-3">Client</th>
                <th className="p-3">Téléphone</th>
                <th className="p-3">Désignation</th>
                <th className="p-3">Total</th>
                <th className="p-3">Avance</th>
                <th className="p-3">Reste</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Chargement des ventes...</td></tr>
              ) : filteredVentes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Aucune vente trouvée.</td></tr>
              ) : filteredVentes.map((v) => (
                <tr key={v.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">{v.client_nom}</td>
                  <td className="p-3 text-slate-500">{v.client_tel || '-'}</td>
                  <td className="p-3 text-slate-700">{getItemName(v)}</td>
                  <td className="p-3 font-bold text-slate-900">{formatAmount(v.montant_total)} FCFA</td>
                  <td className="p-3 text-emerald-600 font-semibold">{formatAmount(v.avance)} FCFA</td>
                  <td className="p-3 font-bold text-amber-600">{formatAmount(v.reste)} FCFA</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedVente(v)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-md shadow-xs transition-colors"
                    >
                      Facture
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOUVELLE VENTE / ARTICLE */}
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
              <h2 className="text-lg font-bold text-slate-900">Nouvelle Vente / Article</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVente} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Nom du client *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_nom}
                    onChange={(e) => handleFormChange('client_nom', e.target.value)}
                    className="w-full p-2 border rounded-md bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.client_tel}
                    onChange={(e) => handleFormChange('client_tel', e.target.value)}
                    className="w-full p-2 border rounded-md bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Désignation / Article *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Diaspora (x2), Boubou VIP..."
                  value={formData.designation}
                  onChange={(e) => handleFormChange('designation', e.target.value)}
                  className="w-full p-2 border rounded-md bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantite}
                    onChange={(e) => handleFormChange('quantite', e.target.value)}
                    className="w-full p-2 border rounded-md bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Prix Unitaire (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prix_unitaire}
                    onChange={(e) => handleFormChange('prix_unitaire', e.target.value)}
                    className="w-full p-2 border rounded-md bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Montant Total</label>
                  <input
                    type="number"
                    readOnly
                    value={formData.montant_total}
                    className="w-full p-2 border rounded-md bg-slate-100 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Avance versée (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.avance}
                    onChange={(e) => handleFormChange('avance', e.target.value)}
                    className="w-full p-2 border rounded-md bg-slate-50 text-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reste à payer</label>
                  <input
                    type="number"
                    readOnly
                    value={formData.reste}
                    className="w-full p-2 border rounded-md bg-amber-50 text-amber-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Observations</label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => handleFormChange('observations', e.target.value)}
                  placeholder="Notes sur la livraison ou commande..."
                  className="w-full p-2 border rounded-md bg-slate-50"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FACTURE */}
      {selectedVente && (
        <div 
          onClick={() => setSelectedVente(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 my-8"
          >
            {/* Barre d'action sup */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Printer size={15} /> Imprimer
                </button>
                <button
                  onClick={handleSharePDFWhatsApp}
                  disabled={exporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Share2 size={15} /> {exporting ? 'Génération...' : 'WhatsApp (PDF)'}
                </button>
              </div>

              <button
                onClick={() => setSelectedVente(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Facture à l'écran */}
            <div className="p-6 border-2 border-amber-600/80 rounded-xl bg-white space-y-6">
              
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-amber-900 tracking-wide">Ousmane Design</h2>
                  <p className="text-[10px] uppercase font-bold text-amber-700 tracking-widest mt-0.5">
                    Création & Couture Contemporaine
                  </p>
                </div>

                <div className="border border-amber-200/80 bg-amber-50/30 p-2.5 rounded-lg text-[11px] text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-amber-700 shrink-0" />
                    <span>Hann Maristes, Dakar, Sénégal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-amber-700 shrink-0" />
                    <span>77 646 21 02 / 70 348 26 82</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} className="text-amber-700 shrink-0" />
                    <span>@ousmanedesign.sn</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border border-amber-200 rounded-lg p-3 bg-amber-50/20 text-xs">
                <div className="space-y-1">
                  <p><strong className="text-slate-800">Nom du client :</strong> {selectedVente.client_nom}</p>
                  <p><strong className="text-slate-800">Téléphone :</strong> <span className="text-amber-700 font-medium">{selectedVente.client_tel || '-'}</span></p>
                  <p><strong className="text-slate-800">Date de commande :</strong> {selectedVente.created_at ? new Date(selectedVente.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="space-y-1">
                  <p><strong className="text-slate-800">Mode de commande :</strong> {selectedVente.mode_commande || 'Prêt-à-porter'}</p>
                  <p><strong className="text-slate-800">Mode de paiement :</strong> {selectedVente.mode_paiement || 'Espèces'}</p>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white font-bold uppercase tracking-wider">
                    <th className="p-2.5 rounded-tl-lg">Désignation</th>
                    <th className="p-2.5 text-center">Quantité</th>
                    <th className="p-2.5 text-right">Prix Unitaire</th>
                    <th className="p-2.5 text-right rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 border-b border-amber-200">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-800">{getItemName(selectedVente)}</td>
                    <td className="p-2.5 text-center">{selectedVente.quantite || 1}</td>
                    <td className="p-2.5 text-right">{formatAmount(selectedVente.prix_unitaire || selectedVente.montant_total)} FCFA</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{formatAmount(selectedVente.montant_total)} FCFA</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <p className="font-bold text-slate-700 mb-1">OBSERVATIONS :</p>
                  <p className="text-slate-500 italic">{selectedVente.observations || 'Articles livrés en parfait état.'}</p>
                </div>

                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">MONTANT TOTAL :</span>
                    <span className="font-bold text-slate-900">{formatAmount(selectedVente.montant_total)} FCFA</span>
                  </div>
                  <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">AVANCE VERSÉE :</span>
                    <span className="font-bold text-emerald-600">{formatAmount(selectedVente.avance)} FCFA</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-amber-600 text-white font-bold rounded-md">
                    <span>RESTE À PAYER :</span>
                    <span>{formatAmount(selectedVente.reste)} FCFA</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-8 text-[11px] text-center font-bold text-slate-700">
                <div>
                  <p className="uppercase tracking-wider">Signature du Client</p>
                  <div className="mt-8 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <p className="uppercase tracking-wider">Ousmane Design (Signature & Cachet)</p>
                  <div className="mt-8 border-b border-dashed border-slate-300"></div>
                </div>
              </div>

              <p className="text-[10px] text-center text-slate-400 italic pt-2 border-t border-amber-100">
                Merci pour votre confiance ! — L'élégance sur mesure, pensée pour vous.
              </p>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
