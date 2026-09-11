import React, { useState } from 'react';
import { submitDocument } from '../lib/api';

export default function UploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    // 10MB file size cap check per project constraints
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await submitDocument(file);
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to upload document.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Upload Compliance Document</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Document (PDF, DOCX, XLSX - Max 10MB)
            </label>
            <input 
              type="file" 
              accept=".pdf,.docx,.xlsx" 
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}