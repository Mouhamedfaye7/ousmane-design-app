'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, UserPlus, Search, Ruler, Phone, MapPin, User, Save, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  nom_complet: string;
  telephone: string;
  adresse: string;
  created_at: string;
}

interface Mesures {
  id?: string;
  client_id: string;
  cou: number;
  epaule: number;
  poitrine: number;
  longueur_bras: number;
  tour_bras: number;
  poignet: number;
  longueur_boubou: number;
  ceinture: number;
  longueur_pantalon: number;
  tour_cuisse: number;
  tour_cheville: number;
  notes: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  
  // Modal Création Client
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newTel, setNewTel] = useState('');
  const [newAdresse, setNewAdresse] = useState('');

  // Carnet de mesures
  const [mesures, setMesures] = useState<Mesures>({
    client_id: '',
    cou: 0,
    epaule: 0,
    poitrine: 0,
    longueur_bras: 0,
    tour_bras: 0,
    poignet: 0,
    longueur_boubou: 0,
    ceinture: 0,
    longueur_pantalon: 0,
    tour_cuisse: 0,
    tour_cheville: 0,
    notes: ''
  });

  const [savingMesures, setSavingMesures] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchMesures(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('nom_complet', { ascending: true });
    if (data) setClients(data);
  };

  const fetchMesures = async (clientId: string) => {
    const { data } = await supabase.from('mesures').select('*').eq('client_id', clientId).single();
    if (data) {
      setMesures(data);
    } else {
      setMesures({
        client_id: clientId,
        cou: 0,
        epaule: 0,
        poitrine: 0,
        longueur_bras: 0,
        tour_bras: 0,
        poignet: 0,
        longueur_boubou: 0,
        ceinture: 0,
        longueur_pantalon: 0,
        tour_cuisse: 0,
        tour_cheville: 0,
        notes: ''
      });
    }
  };

  const handleCreateClient = async () => {
    if (!newNom || !newTel) return;
    const { data, error } = await supabase.from('clients').insert([{
      nom_complet: newNom,
      telephone: newTel,
      adresse: newAdresse
    }]).select().single();

    if (data) {
      setClients([...clients, data]);
      setSelectedClient(data);
      setIsModalOpen(false);
      setNewNom('');
      setNewTel('');
      setNewAdresse('');
    } else if (error) {
      alert("Erreur lors de la création du client : " + error.message);
    }
  };

  const handleSaveMesures = async () => {
    if (!selectedClient) return;
    setSavingMesures(true);

    const payload = { ...mesures, client_id: selectedClient.id };

    let res;
    if (mesures.id) {
      res = await supabase.from('mesures').update(payload).eq('id', mesures.id);
    } else {
      res = await supabase.from('mesures').insert([payload]).select().single();
      if (res.data) setMesures(res.data);
    }

    setSavingMesures(false);
    if (!res.error) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      alert("Erreur d'enregistrement : " + res.error.message);
    }
  };

  const filteredClients = clients.filter(c => 
    c.nom_complet.toLowerCase().includes(search.toLowerCase()) || 
    c.telephone.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* En-tête */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Clients & Carnet de Mesures</h1>
          <p className="text-slate-500 text-sm">Ousmane Design — Gestion des profils clients</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 bg-[#b8860b] hover:bg-[#966d09] text-white font-medium rounded-xl shadow-sm transition"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Nouveau Client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Colonne Liste des clients */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher nom, téléphone..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
            />
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredClients.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between ${
                  selectedClient?.id === c.id ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{c.nom_complet}</h3>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    <Phone className="w-3 h-3 mr-1" /> {c.telephone}
                  </p>
                </div>
                {selectedClient?.id === c.id && (
                  <Ruler className="w-4 h-4 text-[#b8860b]" />
                )}
              </div>
            ))}
            {filteredClients.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-400">Aucun client trouvé.</p>
            )}
          </div>
        </div>

        {/* Colonne Carnet de Mesures */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {selectedClient ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center">
                    <User className="w-5 h-5 mr-2 text-[#b8860b]" /> {selectedClient.nom_complet}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center mt-1 gap-3">
                    <span><Phone className="w-3 h-3 inline mr-1" />{selectedClient.telephone}</span>
                    {selectedClient.adresse && (
                      <span><MapPin className="w-3 h-3 inline mr-1" />{selectedClient.adresse}</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={handleSaveMesures}
                  disabled={savingMesures}
                  className="inline-flex items-center px-4 py-2 bg-[#b8860b] hover:bg-[#966d09] text-white rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {savingMesures ? 'Enregistrement...' : 'Enregistrer les Mesures'}
                </button>
              </div>

              {savedSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" /> Mesures mises à jour avec succès !
                </div>
              )}

              {/* Formulaire des mesures */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cou (cm)</label>
                  <input
                    type="number"
                    value={mesures.cou || ''}
                    onChange={e => setMesures({ ...mesures, cou: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Épaule (cm)</label>
                  <input
                    type="number"
                    value={mesures.epaule || ''}
                    onChange={e => setMesures({ ...mesures, epaule: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Poitrine (cm)</label>
                  <input
                    type="number"
                    value={mesures.poitrine || ''}
                    onChange={e => setMesures({ ...mesures, poitrine: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longueur Bras (cm)</label>
                  <input
                    type="number"
                    value={mesures.longueur_bras || ''}
                    onChange={e => setMesures({ ...mesures, longueur_bras: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tour de Bras (cm)</label>
                  <input
                    type="number"
                    value={mesures.tour_bras || ''}
                    onChange={e => setMesures({ ...mesures, tour_bras: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Poignet (cm)</label>
                  <input
                    type="number"
                    value={mesures.poignet || ''}
                    onChange={e => setMesures({ ...mesures, poignet: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longueur Boubou/Haut (cm)</label>
                  <input
                    type="number"
                    value={mesures.longueur_boubou || ''}
                    onChange={e => setMesures({ ...mesures, longueur_boubou: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ceinture/Taille (cm)</label>
                  <input
                    type="number"
                    value={mesures.ceinture || ''}
                    onChange={e => setMesures({ ...mesures, ceinture: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longueur Pantalon (cm)</label>
                  <input
                    type="number"
                    value={mesures.longueur_pantalon || ''}
                    onChange={e => setMesures({ ...mesures, longueur_pantalon: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tour Cuisse (cm)</label>
                  <input
                    type="number"
                    value={mesures.tour_cuisse || ''}
                    onChange={e => setMesures({ ...mesures, tour_cuisse: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tour Cheville (cm)</label>
                  <input
                    type="number"
                    value={mesures.tour_cheville || ''}
                    onChange={e => setMesures({ ...mesures, tour_cheville: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Particularités du Modèle</label>
                <textarea
                  rows={3}
                  value={mesures.notes || ''}
                  onChange={e => setMesures({ ...mesures, notes: e.target.value })}
                  placeholder="Ex: Préfère les col officier, manches un peu plus larges..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Ruler className="w-12 h-12 mb-3 text-gray-700" />
              <p className="text-sm font-medium">Sélectionnez un client à gauche pour voir ou saisir ses mesures.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL CRÉATION CLIENT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Nouveau Client</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  value={newNom}
                  onChange={e => setNewNom(e.target.value)}
                  placeholder="Ex: Amadou Diallo"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone *</label>
                <input
                  type="text"
                  value={newTel}
                  onChange={e => setNewTel(e.target.value)}
                  placeholder="Ex: 77 000 00 00"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse / Quartier</label>
                <input
                  type="text"
                  value={newAdresse}
                  onChange={e => setNewAdresse(e.target.value)}
                  placeholder="Ex: Keur Massar, Dakar"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateClient}
                className="px-4 py-2 bg-[#b8860b] hover:bg-[#966d09] text-white rounded-lg text-sm font-semibold"
              >
                Créer Client
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
