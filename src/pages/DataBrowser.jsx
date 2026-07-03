import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Database, ChevronRight, Save, X } from "lucide-react";
import { motion } from "framer-motion";

const DataBrowser = () => {
  const [collections, setCollections] = useState(['users', 'audit_logs', 'birthday_logs', 'mail_queue', 'metadata', 'promotions']);
  const [selectedCol, setSelectedCol] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editValues, setEditValues] = useState({});

  const fetchDocuments = async (colName) => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, colName));
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDocuments(docs);
      setSelectedCol(colName);
    } catch (e) {
      console.error("Error fetching docs:", e);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (doc) => {
    setEditingDoc(doc.id);
    setEditValues({ ...doc });
  };

  const saveEdit = async () => {
    if (!selectedCol || !editingDoc) return;
    try {
      const { id, ...dataToSave } = editValues;
      await updateDoc(doc(db, selectedCol, editingDoc), dataToSave);
      setEditingDoc(null);
      fetchDocuments(selectedCol); // Refresh
    } catch (e) {
      console.error("Error saving doc:", e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black p-12 text-white">
      <h2 className="text-4xl font-black mb-8 flex items-center gap-4">
        <Database className="text-cyan-500" /> SYSTEM DATA BROWSER
      </h2>

      <div className="flex gap-8">
        <div className="w-1/4 border border-[#1a1a1a] p-4 bg-[#050505]">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 font-black">Collections</h3>
          {collections.map(col => (
            <button 
              key={col}
              onClick={() => fetchDocuments(col)}
              className={`w-full text-left p-3 text-sm font-bold flex justify-between items-center ${selectedCol === col ? 'bg-cyan-900/20 text-cyan-500' : 'hover:bg-[#1a1a1a]'}`}
            >
              {col}
              <ChevronRight size={14} />
            </button>
          ))}
        </div>

        <div className="w-3/4 border border-[#1a1a1a] bg-[#050505] p-6">
          {loading ? <p>Loading...</p> : (
            <div className="space-y-4">
              {documents.map((d) => (
                <div key={d.id} className="border border-[#1a1a1a] p-4 bg-[#0a0a0a]">
                  {editingDoc === d.id ? (
                    <div className="space-y-2">
                      <textarea 
                        className="w-full bg-black text-green-500 font-mono p-2 border border-gray-700"
                        value={JSON.stringify(editValues, null, 2)}
                        onChange={(e) => setEditValues(JSON.parse(e.target.value))}
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="bg-cyan-600 px-4 py-2 text-xs font-bold"><Save size={14} /></button>
                        <button onClick={() => setEditingDoc(null)} className="bg-red-900 px-4 py-2 text-xs font-bold"><X size={14} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <pre className="text-xs text-green-500 font-mono">{JSON.stringify(d, null, 2)}</pre>
                      <button onClick={() => startEdit(d)} className="text-cyan-500 text-xs font-bold border border-cyan-500/30 px-2 py-1">EDIT</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DataBrowser;
