'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Printer, MessageCircle } from 'lucide-react';

export default function CommandesPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Suivi d'Atelier & Commandes</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Pilotage de la production</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Nouvelle Commande
        </button>
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Colonne Reçue */}
        <div className="bg-slate-200/60 p-4 rounded-xl border border-slate-300/60">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-sm text-slate-700">Reçue</span>
            <span className="bg-slate-300 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">1</span>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-slate-900 text-sm">Mouhamed Faye</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">CMD-803678</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">caftane</p>
            <div className="text-xs text-slate-500 flex justify-between mb-3">
              <span>Total: <strong className="text-slate-800">50 000 F</strong></span>
              <span>Reste: <strong className="text-amber-700 font-bold">30 000 F</strong></span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <select className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-800">
                <option>Reçue</option>
                <option>En Coupe</option>
                <option>Prête</option>
                <option>Livrée</option>
              </select>
              <div className="flex gap-2">
                <button className="text-slate-500 hover:text-slate-700"><Printer size={16} /></button>
                <button className="text-emerald-600 hover:text-emerald-700"><MessageCircle size={16} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne En Coupe */}
        <div className="bg-slate-200/60 p-4 rounded-xl border border-slate-300/60">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-sm text-indigo-700">En Coupe</span>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">0</span>
          </div>
          <p className="text-xs text-slate-400 text-center py-8">Aucune commande</p>
        </div>

        {/* Colonne Prête */}
        <div className="bg-slate-200/60 p-4 rounded-xl border border-slate-300/60">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-sm text-emerald-700">Prête</span>
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">0</span>
          </div>
          <p className="text-xs text-slate-400 text-center py-8">Aucune commande</p>
        </div>

        {/* Colonne Livrée */}
        <div className="bg-slate-200/60 p-4 rounded-xl border border-slate-300/60">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-sm text-amber-800">Livrée</span>
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">0</span>
          </div>
          <p className="text-xs text-slate-400 text-center py-8">Aucune commande</p>
        </div>
      </div>

      {/* Modal Commande */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nouvelle Commande Sur-Mesure</h2>
            
            <form onSubmit={(e) => { e.preventDefault(); setShowModal(false); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client *</label>
                <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="">-- Sélectionner un client --</option>
                  <option value="1">Mouhamed Faye (785112139)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description du Modèle / Tissu</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Boubou Getzner 3 pièces brodé or..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prix Total (FCFA) *</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 35000"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Acompte Versé (FCFA)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 15000"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date de livraison souhaitée</label>
                <input 
                  type="date" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors"
                >
                  Enregistrer Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
