import React, { useEffect, useState } from 'react';
import { listDocuments, getAssist, decide } from '../lib/api';

export default function ReviewQueue() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [assistData, setAssistData] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      // Fetch pending documents for review
      const data = await listDocuments('pending');
      setDocuments(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleSelectDoc = async (doc) => {
    setSelectedDoc(doc);
    setAssistData(null);
    setComment('');
    try {
      const assist = await getAssist(doc.id);
      setAssistData(assist);
    } catch (err) {
      console.error('Failed to load AI assist data', err);
    }
  };

  const handleDecision = async (status) => {
    if (!selectedDoc) return;
    setActionLoading(true);
    try {
      await decide(selectedDoc.id, status, comment);
      setSelectedDoc(null);
      setComment('');
      setAssistData(null);
      fetchQueue();
    } catch (err) {
      setError(err.message || 'Failed to submit decision.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Compliance Officer Review Queue</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Queue List */}
          <div className="bg-white shadow-md rounded-lg p-4 lg:col-span-1">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Pending Submissions</h2>
            {loading ? (
              <p className="text-gray-500 text-sm">Loading queue...</p>
            ) : documents.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending documents to review.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <li 
                    key={doc.id} 
                    onClick={() => handleSelectDoc(doc)}
                    className={`p-3 cursor-pointer rounded-lg transition-colors ${selectedDoc?.id === doc.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">Doc #{doc.id}</span>
                      <span className="text-xs text-gray-500">{new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Review & AI Assist Workspace */}
          <div className="bg-white shadow-md rounded-lg p-6 lg:col-span-2">
            {selectedDoc ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Reviewing Document #{selectedDoc.id}</h2>
                  <p className="text-sm text-gray-500">Status: {selectedDoc.status}</p>
                </div>

                {/* AI Assist Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">AI-Assisted Flag & Precedent Analysis</h3>
                  {assistData ? (
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Flags:</strong> {assistData.flags || 'None detected'}</p>
                      <p><strong>Precedents:</strong> {assistData.precedents || 'No matching precedent found'}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-blue-600">Analyzing document...</p>
                  )}
                </div>

                {/* Decision Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Comment</label>
                    <textarea 
                      rows="3"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Provide reasoning for your decision..."
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button 
                      onClick={() => handleDecision('approved')}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Approve'}
                    </button>
                    <button 
                      onClick={() => handleDecision('rejected')}
                      disabled={actionLoading}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm py-12">
                Select a document from the queue to begin review.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}