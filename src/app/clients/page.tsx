'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, Save, Trash2, Send, Ruler, FileText, Tag as TagIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Client {
  id?: string;
  nom: string;
  telephone: string;
  adresse: string;
  cou?: number | string;
  epaule?: number | string;
  poitrine?: number | string;
  longueur_bras?: number | string;
  tour_bras?: number | string;
  poignet?: number | string;
  longueur_haut?: number | string;
  ceinture?: number | string;
  longueur_pantalon?: number | string;
  tour_cuisse?: number | string;
  tour_cheville?: number | string;
  notes?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const ficheRef = useRef<HTMLDivElement>(null);
  const etiquetteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        // Uniformiser nom / nom_complet au cas où
        const formattedData = data.map((c: any) => ({
          ...c,
          nom: c.nom || c.nom_complet || ''
        }));
        setClients(formattedData);
        if (formattedData.length > 0) {
          setSelectedClient(formattedData[0]);
        } else {
          setSelectedClient(null);
        }
      }
    } catch (err) {
      console.error('Erreur chargement clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const sanitizeClientPayload = (client: Client) => {
    const payload: any = {
      nom: client.nom || 'Sans nom',
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      notes: client.notes || ''
    };

    const numericFields: (keyof Client)[] = [
      'cou', 'epaule', 'poitrine', 'longueur_bras', 'tour_bras',
      'poignet', 'longueur_haut', 'ceinture', 'longueur_pantalon',
      'tour_cuisse', 'tour_cheville'
    ];

    numericFields.forEach((field) => {
      const val = client[field];
      if (val !== undefined && val !== '' && val !== null && !isNaN(Number(val))) {
        payload[field] = Number(val);
      } else {
        payload[field] = null;
      }
    });

    return payload;
  };

  const handleSave = async () => {
    if (!selectedClient) return;

    const payload = sanitizeClientPayload(selectedClient);

    try {
      if (selectedClient.id) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', selectedClient.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert([payload])
          .select();

        if (error) throw error;
        if (data && data[0]) setSelectedClient(data[0]);
      }

      alert('Fiche client enregistrée avec succès !');
      await fetchClients();
    } catch (err: any) {
      console.error('Erreur enregistrement:', err);
      alert('Erreur lors de la sauvegarde : ' + (err.message || 'Problème de connexion Supabase'));
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    const nomAffiche = selectedClient.nom || selectedClient.telephone || 'ce client';

    if (!confirm(`Voulez-vous vraiment supprimer définitivement ${nomAffiche} ?`)) {
      return;
    }

    try {
      if (selectedClient.id) {
        const { error } = await supabase.from('clients').delete().eq('id', selectedClient.id);
        if (error && selectedClient.telephone) {
          await supabase.from('clients').delete().eq('telephone', selectedClient.telephone);
        }
      } else if (selectedClient.telephone) {
        await supabase.from('clients').delete().eq('telephone', selectedClient.telephone);
      }

      const listFiltree = clients.filter(c => {
        if (selectedClient.id && c.id) return c.id !== selectedClient.id;
        if (selectedClient.telephone && c.telephone) return c.telephone !== selectedClient.telephone;
        return true;
      });

      setClients(listFiltree);
      setSelectedClient(listFiltree.length > 0 ? listFiltree[0] : null);

      alert('Client supprimé avec succès.');
      fetchClients();
    } catch (err: any) {
      alert('Erreur lors de la suppression : ' + (err.message || 'Impossible de supprimer.'));
    }
  };

  const handleShareWhatsApp = () => {
    if (!selectedClient) return;
    let cleanPhone = (selectedClient.telephone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

    let msg = `*OUSMANE DESIGN — Carnet de Mesures*\n`;
    msg += `Client: *${selectedClient.nom || 'Sans nom'}*\n\n`;
    if (selectedClient.cou) msg += `- Cou: ${selectedClient.cou} cm\n`;
    if (selectedClient.epaule) msg += `- Épaule: ${selectedClient.epaule} cm\n`;
    if (selectedClient.poitrine) msg += `- Poitrine: ${selectedClient.poitrine} cm\n`;
    if (selectedClient.longueur_bras) msg += `- Long. Bras: ${selectedClient.longueur_bras} cm\n`;
    if (selectedClient.longueur_haut) msg += `- Long. Haut: ${selectedClient.longueur_haut} cm\n`;
    if (selectedClient.ceinture) msg += `- Ceinture/Taille: ${selectedClient.ceinture} cm\n`;
    if (selectedClient.longueur_pantalon) msg += `- Long. Pantalon: ${selectedClient.longueur_pantalon} cm\n`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleNewClient = () => {
    const newC: Client = {
      nom: '',
      telephone: '',
      adresse: '',
      notes: ''
    };
    setSelectedClient(newC);
  };

  const filteredClients = clients.filter(c => 
    (c.nom || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.telephone || '').includes(search)
  );

  const mesureFields: Array<{ label: string; shortLabel: string; key: keyof Client }> = [
    { label: 'Cou (cm)', shortLabel: 'Cou', key: 'cou' },
    { label: 'Épaule (cm)', shortLabel: 'Épaule', key: 'epaule' },
    { label: 'Poitrine (cm)', shortLabel: 'Poitrine', key: 'poitrine' },
    { label: 'Longueur Bras (cm)', shortLabel: 'Long. Bras', key: 'longueur_bras' },
    { label: 'Tour de Bras (cm)', shortLabel: 'Tour Bras', key: 'tour_bras' },
    { label: 'Poignet (cm)', shortLabel: 'Poignet', key: 'poignet' },
    { label: 'Longueur Boubou/Haut (cm)', shortLabel: 'Long. Haut', key: 'longueur_haut' },
    { label: 'Ceinture/Taille (cm)', shortLabel: 'Ceinture', key: 'ceinture' },
    { label: 'Longueur Pantalon (cm)', shortLabel: 'Long. Pantalon', key: 'longueur_pantalon' },
    { label: 'Tour Cuisse (cm)', shortLabel: 'Tour Cuisse', key: 'tour_cuisse' },
    { label: 'Tour Cheville (cm)', shortLabel: 'Tour Cheville', key: 'tour_cheville' },
  ];

  // Mesures effectivement renseignées pour le client sélectionné (utilisé par la fiche PDF et l'étiquette)
  const getFilledMeasures = (client: Client) => {
    return mesureFields.filter(m => {
      const v = client[m.key];
      return v !== undefined && v !== null && v !== '';
    });
  };

  // --- GÉNÉRATION FICHE PDF COMPLÈTE (A4, soignée et lisible) ---
  const downloadFichePDF = async () => {
    if (!selectedClient) return;
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const { default: jsPDF } = await import('jspdf');
      const element = ficheRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, imgHeight);
      pdf.save(`Fiche_Mesures_${(selectedClient.nom || 'Client').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Erreur génération fiche PDF :', err);
      alert('Erreur lors de la génération de la fiche PDF. Veuillez réessayer.');
    }
  };

  // --- GÉNÉRATION ÉTIQUETTE TISSU (petit format à découper et coller/agrafer) ---
  const downloadEtiquettePDF = async () => {
    if (!selectedClient) return;
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const { default: jsPDF } = await import('jspdf');
      const element = etiquetteRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      // Petit format type étiquette : 80mm x 120mm (facile à découper et coller sur le tissu)
      const pdf = new jsPDF({ unit: 'mm', format: [80, 120], orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 3;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const finalHeight = Math.min(imgHeight, pageHeight - margin * 2);

      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, finalHeight);
      pdf.save(`Etiquette_${(selectedClient.nom || 'Client').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Erreur génération étiquette PDF :', err);
      alert('Erreur lors de la génération de l\'étiquette. Veuillez réessayer.');
    }
  };

  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Clients & Carnet de Mesures</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Gestion des profils clients</p>
        </div>
        <button 
          onClick={handleNewClient}
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus size={18} /> Nouveau Client
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LISTE CLIENTS */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher nom, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-sm outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-400 p-2">Chargement des clients...</p>
            ) : filteredClients.length === 0 ? (
              <p className="text-sm text-slate-400 p-2">Aucun client trouvé.</p>
            ) : (
              filteredClients.map((c) => (
                <div
                  key={c.id || c.telephone || c.nom}
                  onClick={() => setSelectedClient(c)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all bg-white ${
                    (selectedClient?.id && selectedClient.id === c.id) ||
                    (!selectedClient?.id && selectedClient?.telephone === c.telephone)
                      ? 'border-amber-500 ring-2 ring-amber-500/20' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{c.nom || 'Sans nom'}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{c.telephone || 'Sans téléphone'}</p>
                    </div>
                    <Ruler size={16} className="text-amber-600" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FORMULAIRE & MESURES */}
        {selectedClient ? (
          <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-4">
              <div>
                <input
                  type="text"
                  value={selectedClient.nom || ''}
                  onChange={(e) => setSelectedClient({...selectedClient, nom: e.target.value})}
                  placeholder="Nom complet du client"
                  className="text-2xl font-bold text-slate-900 border-b border-dashed border-slate-300 focus:border-amber-500 outline-none pb-1"
                />
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="text"
                    value={selectedClient.telephone || ''}
                    onChange={(e) => setSelectedClient({...selectedClient, telephone: e.target.value})}
                    placeholder="Numéro Téléphone"
                    className="text-xs text-slate-500 border-b border-slate-200 outline-none"
                  />
                  <input
                    type="text"
                    value={selectedClient.adresse || ''}
                    onChange={(e) => setSelectedClient({...selectedClient, adresse: e.target.value})}
                    placeholder="Adresse / Quartier"
                    className="text-xs text-slate-500 border-b border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={downloadFichePDF}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-xs"
                  title="Télécharger la fiche de mesures complète en PDF"
                >
                  <FileText size={14} /> Fiche PDF
                </button>

                <button
                  onClick={downloadEtiquettePDF}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-xs"
                  title="Télécharger une petite étiquette à découper et coller sur le tissu"
                >
                  <TagIcon size={14} /> Étiquette Tissu
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-xs"
                >
                  <Send size={14} /> Partager WhatsApp
                </button>

                <button
                  onClick={handleDeleteClient}
                  className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                  title="Supprimer définitivement ce client"
                >
                  <Trash2 size={18} />
                </button>

                <button
                  onClick={handleSave}
                  className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-xs"
                >
                  <Save size={14} /> Enregistrer
                </button>
              </div>
            </div>

            {/* GRILLE DES MESURES */}
            <div className="grid grid-cols-3 gap-4">
              {mesureFields.map((m) => (
                <div key={m.key}>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">{m.label}</label>
                  <input
                    type="number"
                    value={selectedClient[m.key] ?? ''}
                    onChange={(e) => setSelectedClient({
                      ...selectedClient, 
                      [m.key]: e.target.value ? Number(e.target.value) : ''
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:bg-white focus:border-amber-500"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Notes & Particularités du Modèle</label>
              <textarea
                value={selectedClient.notes || ''}
                onChange={(e) => setSelectedClient({...selectedClient, notes: e.target.value})}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
            Sélectionnez un client ou cliquez sur "Nouveau Client".
          </div>
        )}
      </div>

      {/* CONTENU CACHÉ POUR GÉNÉRATION DE LA FICHE PDF COMPLÈTE */}
      {selectedClient && (
        <div
          ref={ficheRef}
          className="fixed top-0 left-[-10000px] w-[750px] bg-white p-8 text-slate-900 font-sans space-y-6"
        >
          {/* En-tête */}
          <div className="flex justify-between items-start border-b-2 border-amber-900/20 pb-4">
            <div>
              <h1 className="text-2xl font-serif font-extrabold text-amber-900 tracking-wide">Ousmane Design</h1>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Création & Couture Contemporaine</p>
              <p className="text-xs text-slate-600 mt-1">Hann Maristes, Dakar, Sénégal · 77 646 21 02 / 70 348 26 82</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-amber-900 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider">
                Carnet de Mesures
              </span>
              <p className="text-xs font-semibold text-slate-500 mt-2">Généré le {dateGeneration}</p>
            </div>
          </div>

          {/* Identité du client */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
            <p className="text-2xl font-bold text-slate-900">{selectedClient.nom || 'Sans nom'}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-slate-600">
              {selectedClient.telephone && <span>📞 {selectedClient.telephone}</span>}
              {selectedClient.adresse && <span>📍 {selectedClient.adresse}</span>}
            </div>
          </div>

          {/* Tableau des mesures (2 colonnes, uniquement les mesures renseignées) */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-3">
              Mesures Corporelles
            </h2>
            {getFilledMeasures(selectedClient).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucune mesure enregistrée pour ce client.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {getFilledMeasures(selectedClient).map((m) => (
                  <div key={m.key} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                    <span className="text-xs font-semibold text-slate-600">{m.shortLabel}</span>
                    <span className="text-sm font-bold text-amber-800">{selectedClient[m.key]} cm</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {selectedClient.notes && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                Notes & Particularités
              </h2>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
                {selectedClient.notes}
              </p>
            </div>
          )}

          <div className="text-[9px] text-slate-400 text-center pt-4 border-t border-slate-200">
            Fiche de mesures confidentielle — Ousmane Design — {dateGeneration}
          </div>
        </div>
      )}

      {/* CONTENU CACHÉ POUR GÉNÉRATION DE L'ÉTIQUETTE TISSU (petit format) */}
      {selectedClient && (
        <div
          ref={etiquetteRef}
          className="fixed top-0 left-[-10000px] w-[290px] bg-white p-3 text-slate-900 font-sans"
        >
          <div className="border-2 border-amber-800 rounded-lg p-3 space-y-2">
            <div className="text-center border-b border-amber-800/30 pb-1.5">
              <p className="text-[9px] font-bold text-amber-800 uppercase tracking-wider">Ousmane Design</p>
              <p className="text-sm font-extrabold text-slate-900 leading-tight mt-0.5">
                {selectedClient.nom || 'Sans nom'}
              </p>
              {selectedClient.telephone && (
                <p className="text-[9px] text-slate-500">{selectedClient.telephone}</p>
              )}
            </div>

            {getFilledMeasures(selectedClient).length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center py-2">Aucune mesure enregistrée.</p>
            ) : (
              <div className="space-y-1">
                {getFilledMeasures(selectedClient).map((m) => (
                  <div key={m.key} className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-600">{m.shortLabel}</span>
                    <span className="font-extrabold text-amber-800">{selectedClient[m.key]} cm</span>
                  </div>
                ))}
              </div>
            )}

            {selectedClient.notes && (
              <p className="text-[9px] text-slate-500 italic border-t border-slate-200 pt-1.5 leading-tight">
                {selectedClient.notes}
              </p>
            )}

            <p className="text-[8px] text-slate-400 text-center border-t border-slate-200 pt-1">
              {dateGeneration}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
