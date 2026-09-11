import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ReviewQueue from './components/ReviewQueue';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Compliance Document Review App</h1>
        <div className="space-x-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${currentView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('review')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${currentView === 'review' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Review Queue
          </button>
        </div>
      </nav>

      <main>
        {currentView === 'dashboard' ? <Dashboard /> : <ReviewQueue />}
      </main>
    </div>
  );
}