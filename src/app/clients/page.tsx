'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Save, Search, Ruler, Phone, MapPin, X, Share2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Mesures {
  cou: string; epaule: string; poitrine: string; longueurBras: string;
  tourBras: string; poignet: string; longueurHaut: string; ceinture: string;
  longueurPantalon: string; tourCuisse: string; tourCheville: string; notes: string;
}

interface Client {
  id: string;
  nom_complet: string;
  telephone: string;
  adresse: string;
  mesures: Mesures;
}

const defaultMesures: Mesures = {
  cou: '', epaule: '', poitrine: '', longueurBras: '',
  tourBras: '', poignet: '', longueurHaut: '', ceinture: '',
  longueurPantalon: '', tourCuisse: '', tourCheville: '', notes: ''
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentMesures, setCurrentMesures] = useState<Mesures>(defaultMesures);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newTel, setNewTel] = useState('');
  const [newAdresse, setNewAdresse] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur Supabase:', error);
    } else if (data) {
      const formattedClients: Client[] = data.map((item: any) => ({
        id: item.id,
        nom_complet: item.nom_complet || item.nom || 'Sans nom',
        telephone: item.telephone || 'Non renseigné',
        adresse: item.adresse || 'Dakar',
        mesures: item.mesures || defaultMesures
      }));
      setClients(formattedClients);

      if (formattedClients.length > 0 && !selectedClient) {
        setSelectedClient(formattedClients[0]);
        setCurrentMesures(formattedClients[0].mesures || defaultMesures);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchClients())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSelectClient = (c: Client) => {
    setSelectedClient(c);
    setCurrentMesures(c.mesures || defaultMesures);
  };

  const handleSaveMesures = async () => {
    if (!selectedClient) return;

    const { error } = await supabase
      .from('clients')
      .update({ mesures: currentMesures })
      .eq('id', selectedClient.id);

    if (error) {
      alert("Erreur lors de la sauvegarde : " + error.message);
    } else {
      setSelectedClient({ ...selectedClient, mesures: currentMesures });
      alert('Mesures enregistrées avec succès !');
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le client "${selectedClient.nom_complet}" ? Cette action est irréversible.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', selectedClient.id);

    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
    } else {
      const remainingClients = clients.filter(c => c.id !== selectedClient.id);
      setClients(remainingClients);

      if (remainingClients.length > 0) {
        setSelectedClient(remainingClients[0]);
        setCurrentMesures(remainingClients[0].mesures || defaultMesures);
      } else {
        setSelectedClient(null);
        setCurrentMesures(defaultMesures);
      }

      alert('Client supprimé avec succès.');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!selectedClient) return;
    setExporting(true);

    try {
      if (typeof window === 'undefined') return;

      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setTextColor(217, 119, 6);
      doc.text("OUSMANE DESIGN", 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text("Fiche de Mesures Client", 14, 28);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Client : ${selectedClient.nom_complet}`, 14, 38);
      doc.text(`Téléphone : ${selectedClient.telephone}`, 14, 44);
      doc.text(`Adresse : ${selectedClient.adresse}`, 14, 50);
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 14, 56);

      const tableData = [
        ['Cou (cm)', currentMesures.cou || '-'],
        ['Épaule (cm)', currentMesures.epaule || '-'],
        ['Poitrine (cm)', currentMesures.poitrine || '-'],
        ['Longueur Bras (cm)', currentMesures.longueurBras || '-'],
        ['Tour de Bras (cm)', currentMesures.tourBras || '-'],
        ['Poignet (cm)', currentMesures.poignet || '-'],
        ['Longueur Boubou / Haut (cm)', currentMesures.longueurHaut || '-'],
        ['Ceinture / Taille (cm)', currentMesures.ceinture || '-'],
        ['Longueur Pantalon (cm)', currentMesures.longueurPantalon || '-'],
        ['Tour Cuisse (cm)', currentMesures.tourCuisse || '-'],
        ['Tour Cheville (cm)', currentMesures.tourCheville || '-'],
      ];

      autoTable(doc, {
        startY: 62,
        head: [['Mesure', 'Valeur']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [217, 119, 6] },
      });

      if (currentMesures.notes) {
        const finalY = (doc as any).lastAutoTable?.finalY || 180;
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text("Notes & Particularités :", 14, finalY + 10);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(currentMesures.notes, 14, finalY + 16, { maxWidth: 180 });
      }

      const fileName = `Mesures_${(selectedClient.nom_complet || 'Client').replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      let cleanPhone = (selectedClient.telephone || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

      const messageText = `Bonjour ${selectedClient.nom_complet},\n\nVoici vos mesures enregistrées chez *Ousmane Design* :\n` +
        `- Cou: ${currentMesures.cou || '-'} cm\n` +
        `- Épaule: ${currentMesures.epaule || '-'} cm\n` +
        `- Poitrine: ${currentMesures.poitrine || '-'} cm\n` +
        `- Longueur Haut: ${currentMesures.longueurHaut || '-'} cm\n` +
        `- Longueur Pantalon: ${currentMesures.longueurPantalon || '-'} cm\n\n` +
        `Le fichier PDF complet de votre fiche a été téléchargé.`;

      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

      window.open(waUrl, '_blank');

    } catch (err) {
      console.error('Erreur PDF/WhatsApp:', err);
      alert('Erreur lors du partage. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom) return;

    const newClientData = {
      nom_complet: newNom,
      telephone: newTel || 'Non renseigné',
      adresse: newAdresse || 'Dakar',
      mesures: defaultMesures
    };

    const { error } = await supabase.from('clients').insert([newClientData]);

    if (error) {
      alert("Erreur lors de l'ajout : " + error.message);
    } else {
      setNewNom('');
      setNewTel('');
      setNewAdresse('');
      setShowAddModal(false);
      fetchClients();
    }
  };

  const filteredClients = clients.filter(c => 
    (c.nom_complet || '').toLowerCase().includes((search || '').toLowerCase()) || 
    (c.telephone || '').includes(search || '')
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Clients & Carnet de Mesures</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Gestion des profils clients</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors text-sm"
        >
          <UserPlus size={18} /> Nouveau Client
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Liste des Clients */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher nom, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-xs text-slate-400 text-center py-6">Chargement cloud...</p>
            ) : filteredClients.map((c) => (
              <div 
                key={c.id}
                onClick={() => handleSelectClient(c)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                  selectedClient?.id === c.id 
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{c.nom_complet}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone size={12} /> {c.telephone}
                  </p>
                </div>
                <Ruler size={16} className={selectedClient?.id === c.id ? 'text-amber-600' : 'text-slate-300'} />
              </div>
            ))}

            {!loading && filteredClients.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Aucun client trouvé</p>
            )}
          </div>
        </div>

        {/* Fiche Mesures du Client */}
        {selectedClient ? (
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-600 tracking-wider uppercase">Ousmane Design</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedClient.nom_complet}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Phone size={13} /> {selectedClient.telephone}</span>
                  <span className="flex items-center gap-1"><MapPin size={13} /> {selectedClient.adresse}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteClient}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3 py-2.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  title="Supprimer ce client"
                >
                  <Trash2 size={16} /> Supprimer
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  disabled={exporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Share2 size={16} /> {exporting ? 'Génération...' : 'Partager WhatsApp'}
                </button>

                <button
                  onClick={handleSaveMesures}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Save size={16} /> Enregistrer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cou (cm)</label>
                <input type="text" value={currentMesures.cou} onChange={e => setCurrentMesures({ ...currentMesures, cou: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Épaule (cm)</label>
                <input type="text" value={currentMesures.epaule} onChange={e => setCurrentMesures({ ...currentMesures, epaule: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Poitrine (cm)</label>
                <input type="text" value={currentMesures.poitrine} onChange={e => setCurrentMesures({ ...currentMesures, poitrine: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Longueur Bras (cm)</label>
                <input type="text" value={currentMesures.longueurBras} onChange={e => setCurrentMesures({ ...currentMesures, longueurBras: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tour de Bras (cm)</label>
                <input type="text" value={currentMesures.tourBras} onChange={e => setCurrentMesures({ ...currentMesures, tourBras: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Poignet (cm)</label>
                <input type="text" value={currentMesures.poignet} onChange={e => setCurrentMesures({ ...currentMesures, poignet: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Longueur Boubou/Haut (cm)</label>
                <input type="text" value={currentMesures.longueurHaut} onChange={e => setCurrentMesures({ ...currentMesures, longueurHaut: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ceinture/Taille (cm)</label>
                <input type="text" value={currentMesures.ceinture} onChange={e => setCurrentMesures({ ...currentMesures, ceinture: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Longueur Pantalon (cm)</label>
                <input type="text" value={currentMesures.longueurPantalon} onChange={e => setCurrentMesures({ ...currentMesures, longueurPantalon: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tour Cuisse (cm)</label>
                <input type="text" value={currentMesures.tourCuisse} onChange={e => setCurrentMesures({ ...currentMesures, tourCuisse: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tour Cheville (cm)</label>
                <input type="text" value={currentMesures.tourCheville} onChange={e => setCurrentMesures({ ...currentMesures, tourCheville: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
            </div>

            <div className="pt-2">
              <label className="block font-semibold text-xs text-slate-700 mb-1">Notes & Particularités du Modèle</label>
              <textarea 
                rows={3} 
                value={currentMesures.notes} 
                onChange={e => setCurrentMesures({ ...currentMesures, notes: e.target.value })} 
                placeholder="Ex: Épaule droite légèrement tombante, préfère les poches latérales..." 
                className="w-full border border-slate-200 rounded-lg p-3 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
              />
            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
            Sélectionnez un client ou ajoutez-en un nouveau
          </div>
        )}

      </div>

      {/* Modal Nouveau Client */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Ajouter un Client (Cloud)</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom complet *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Katim Touré" 
                  value={newNom} 
                  onChange={e => setNewNom(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Numéro de Téléphone (WhatsApp)</label>
                <input 
                  type="text" 
                  placeholder="Ex: 765432190" 
                  value={newTel} 
                  onChange={e => setNewTel(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse / Quartier</label>
                <input 
                  type="text" 
                  placeholder="Ex: Yeumbeul" 
                  value={newAdresse} 
                  onChange={e => setNewAdresse(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-lg text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-md"
                >
                  Créer et Synchroniser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
