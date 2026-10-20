import React, { useState } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const AdminCleanup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const deleteCollection = async (collectionName: string) => {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const deletePromises = snapshot.docs.map((document) => 
      deleteDoc(doc(db, collectionName, document.id))
    );
    await Promise.all(deletePromises);
  };

  const handleCleanup = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus SEMUA data di koleksi quizzes, submissions, dan students? Tindakan ini tidak bisa dibatalkan.')) {
      return;
    }

    setLoading(true);
    setMessage('Sedang menghapus data dummy...');
    try {
      await Promise.all([
        deleteCollection('quizzes'),
        deleteCollection('submissions'),
        deleteCollection('students')
      ]);
      setMessage('Data dummy (quizzes, submissions, students) berhasil dihapus!');
    } catch (error) {
      console.error('Cleanup error:', error);
      setMessage('Gagal menghapus data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-900">
      <h2 className="font-bold text-red-800 dark:text-red-300">Admin Cleanup</h2>
      <p className="text-xs text-red-600 dark:text-red-400 mt-1">Hapus data dummy dari Firebase.</p>
      <button 
        onClick={handleCleanup}
        disabled={loading}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md mt-2 text-sm font-semibold transition-colors cursor-pointer"
      >
        {loading ? 'Menghapus...' : 'Hapus Data Dummy'}
      </button>
      {message && <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">{message}</p>}
    </div>
  );
};
