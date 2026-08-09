'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Save, Search, Ruler, Phone, MapPin, Trash2, X } from 'lucide-react';

interface Mesures {
  cou: string;
  epaule: string;
  poitrine: string;
  longueurBras: string;
  tourBras: string;
  poignet: string;
  longueurHaut: string;
  ceinture: string;
  longueurPantalon: string;
  tourCuisse: string;
  tourCheville: string;
  notes: string;
}

interface Client {
  id: string;
  nom: string;
  telephone: string;
  adresse: string;
  mesures: Mesures;
}

const defaultMesures: Mesures = {
  cou: '',
  epaule: '',
  poitrine: '',
  longueurBras: '',
  tourBras: '',
  poignet: '',
  longueurHaut: '',
  ceinture: '',
  longueurPantalon: '',
  tourCuisse: '',
  tourCheville: '',
  notes: ''
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([
    {
      id: 'CLI-1',
      nom: 'Mouhamed Faye',
      telephone: '785112139',
      adresse: 'Keur Massar',
      mesures: {
        cou: '41',
        epaule: '51',
        poitrine: '102',
        longueurBras: '64',
        tourBras: '36',
        poignet: '22',
        longueurHaut: '95',
        ceinture: '88',
        longueurPantalon: '105',
        tourCuisse: '58',
        tourCheville: '38',
        notes: 'Préfère les cols officiers, manches un peu plus larges.'
      }
    },
    {
      id: 'CLI-2',
      nom: 'Ousmane Faye',
      telephone: '77 646 21 02',
      adresse: 'Hann Maristes',
      mesures: {
        cou: '42',
        epaule: '50',
        poitrine: '105',
        longueurBras: '65',
        tourBras: '38',
        poignet: '23',
        longueurHaut: '100',
        ceinture: '90',
        longueurPantalon: '108',
        tourCuisse: '60',
        tourCheville: '40',
        notes: 'Couture classique, broderie discrète.'
      }
    }
  ]);

  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentMesures, setCurrentMesures] = useState<Mesures>(defaultMesures);

  // Modal Nouveau Client
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newTel, setNewTel] = useState('');
  const [newAdresse, setNewAdresse] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('ousmane_clients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setClients(parsed);
          setSelectedClient(parsed[0]);
          setCurrentMesures(parsed[0].mesures || defaultMesures);
          return;
        }
      } catch (e) {}
    }
    // Par défaut
    setSelectedClient(clients[0]);
    setCurrentMesures(clients[0].mesures);
    localStorage.setItem('ousmane_clients', JSON.stringify(clients));
  }, []);

  const saveClients = (newClients: Client[]) => {
    setClients(newClients);
    localStorage.setItem('ousmane_clients', JSON.stringify(newClients));
  };

  const handleSelectClient = (c: Client) => {
    setSelectedClient(c);
    setCurrentMesures(c.mesures || defaultMesures);
  };

  const handleSaveMesures = () => {
    if (!selectedClient) return;
    const updated = clients.map(c => c.id === selectedClient.id ? { ...c, mesures: currentMesures } : c);
    saveClients(updated);
    setSelectedClient({ ...selectedClient, mesures: currentMesures });
    alert('Mesures enregistrées avec succès !');
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom) return;

    const newClient: Client = {
      id: `CLI-${Date.now()}`,
      nom: newNom,
      telephone: newTel || 'Non renseigné',
      adresse: newAdresse || 'Dakar',
      mesures: defaultMesures
    };

    const updated = [newClient, ...clients];
    saveClients(updated);
    setSelectedClient(newClient);
    setCurrentMesures(defaultMesures);

    setNewNom('');
    setNewTel('');
    setNewAdresse('');
    setShowAddModal(false);
  };

  const filteredClients = clients.filter(c => 
    c.nom.toLowerCase().includes(search.toLowerCase()) || 
    c.telephone.includes(search)
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
        
        {/* Liste des Clients (Gauche) */}
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
            {filteredClients.map((c) => (
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
                  <h4 className="font-bold text-sm text-slate-900">{c.nom}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone size={12} /> {c.telephone}
                  </p>
                </div>
                <Ruler size={16} className={selectedClient?.id === c.id ? 'text-amber-600' : 'text-slate-300'} />
              </div>
            ))}

            {filteredClients.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Aucun client trouvé</p>
            )}
          </div>
        </div>

        {/* Formulaire de Mesures (Droite) */}
        {selectedClient ? (
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedClient.nom}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Phone size={13} /> {selectedClient.telephone}</span>
                  <span className="flex items-center gap-1"><MapPin size={13} /> {selectedClient.adresse}</span>
                </div>
              </div>

              <button
                onClick={handleSaveMesures}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Save size={16} /> Enregistrer
              </button>
            </div>

            {/* Champs de Mesures */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cou (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.cou} 
                  onChange={e => setCurrentMesures({ ...currentMesures, cou: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Épaule (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.epaule} 
                  onChange={e => setCurrentMesures({ ...currentMesures, epaule: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Poitrine (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.poitrine} 
                  onChange={e => setCurrentMesures({ ...currentMesures, poitrine: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Longueur Bras (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.longueurBras} 
                  onChange={e => setCurrentMesures({ ...currentMesures, longueurBras: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tour de Bras (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.tourBras} 
                  onChange={e => setCurrentMesures({ ...currentMesures, tourBras: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Poignet (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.poignet} 
                  onChange={e => setCurrentMesures({ ...currentMesures, poignet: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Longueur Boubou/Haut (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.longueurHaut} 
                  onChange={e => setCurrentMesures({ ...currentMesures, longueurHaut: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ceinture/Taille (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.ceinture} 
                  onChange={e => setCurrentMesures({ ...currentMesures, ceinture: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Longueur Pantalon (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.longueurPantalon} 
                  onChange={e => setCurrentMesures({ ...currentMesures, longueurPantalon: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tour Cuisse (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.tourCuisse} 
                  onChange={e => setCurrentMesures({ ...currentMesures, tourCuisse: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tour Cheville (cm)</label>
                <input 
                  type="text" 
                  value={currentMesures.tourCheville} 
                  onChange={e => setCurrentMesures({ ...currentMesures, tourCheville: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                />
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
            Sélectionnez un client à gauche ou cliquez sur "+ Nouveau Client"
          </div>
        )}

      </div>

      {/* Modal Création Client */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Ajouter un Client</h2>
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
                  placeholder="Ex: Ibrahima Diallo" 
                  value={newNom} 
                  onChange={e => setNewNom(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Numéro de Téléphone (WhatsApp)</label>
                <input 
                  type="text" 
                  placeholder="Ex: 771234567" 
                  value={newTel} 
                  onChange={e => setNewTel(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse / Quartier</label>
                <input 
                  type="text" 
                  placeholder="Ex: Keur Massar" 
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
                  Créer le profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
