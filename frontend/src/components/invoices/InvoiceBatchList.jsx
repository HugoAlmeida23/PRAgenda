// src/components/invoices/InvoiceBatchList.jsx

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import InvoiceBatchListItem from './InvoiceBatchListItem';
import { FolderOpen } from 'lucide-react';

// --- RECEBER A PROP `clients` ---
const InvoiceBatchList = ({ batches, clients, activeBatchId, setActiveBatchId }) => {
  if (!batches || batches.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
        <FolderOpen size={48} style={{ marginBottom: '1rem', opacity: 0.5 }}/>
        <p>Nenhum lote de faturas foi enviado ainda.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <AnimatePresence>
          {batches.map((batch) => (
            <motion.div key={batch.id} layout>
              <InvoiceBatchListItem 
                batch={batch}
                clients={clients} // <<< PASSAR A PROP `clients` PARA CADA ITEM
                isExpanded={activeBatchId === batch.id}
                onToggle={() => setActiveBatchId(activeBatchId === batch.id ? null : batch.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InvoiceBatchList;