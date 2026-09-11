import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  BookOpen, 
  X
} from 'lucide-react';
import { KnowledgeDocument, KnowledgeStatus } from '../types';

interface KnowledgeManagementViewProps {
  documents: KnowledgeDocument[];
  onAddDocument: (doc: KnowledgeDocument) => void;
  onDeleteDocument: (id: string) => void;
}

export const KnowledgeManagementView: React.FC<KnowledgeManagementViewProps> = ({
  documents,
  onAddDocument,
  onDeleteDocument
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding a new bank policy document
  const [titleMm, setTitleMm] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [category, setCategory] = useState('Cards');
  const [type, setType] = useState<KnowledgeDocument['type']>('Policy');
  const [version, setVersion] = useState('1.0');
  const [contentMm, setContentMm] = useState('');
  const [keywords, setKeywords] = useState('');

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.titleMm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.contentMm.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || d.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleMm || !contentMm) return;

    const newDoc: KnowledgeDocument = {
      id: `doc_${Date.now()}`,
      title: titleEn || titleMm,
      titleMm: titleMm,
      category,
      type,
      version,
      updatedAt: new Date().toISOString().slice(0, 10),
      status: 'Ready',
      sectionsCount: Math.max(1, Math.round(contentMm.length / 100)),
      contentMm: contentMm,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean)
    };

    onAddDocument(newDoc);
    setIsAddModalOpen(false);
    // Reset
    setTitleMm('');
    setTitleEn('');
    setContentMm('');
    setKeywords('');
  };

  const getStatusBadge = (status: KnowledgeStatus) => {
    switch (status) {
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Ready for RAG</span>
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'Needs Review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>Needs Review</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-slate-100 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Approved Bank Knowledge Base (RAG)
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Manage verified banking policies, emergency procedures, and FAQ documentation
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-emerald-950/80 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge Source</span>
        </button>
      </div>

      {/* Search & Type Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search policies, FAQs, or guidelines..."
            className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {['All', 'Policy', 'Procedure', 'FAQ', 'Manual'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                selectedType === t
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table / Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-4 rounded-2xl bg-[#0D182A] border border-slate-800 hover:border-emerald-500/30 transition shadow-md flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {doc.type} • {doc.category}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  v{doc.version}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-100 text-sm line-clamp-1">
                  {doc.title || doc.titleMm}
                </h3>
                {doc.titleMm && doc.title && doc.titleMm !== doc.title && (
                  <p className="text-xs text-slate-400 line-clamp-1">{doc.titleMm}</p>
                )}
              </div>

              {/* Content Preview */}
              <p className="text-xs text-slate-300/80 line-clamp-3 leading-relaxed bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                {doc.contentMm}
              </p>
            </div>

            {/* Footer Metadata */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{doc.sectionsCount} Sections Indexed</span>
                <span>Updated: {doc.updatedAt}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                {getStatusBadge(doc.status)}

                <button
                  onClick={() => onDeleteDocument(doc.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                  title="Delete Document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Knowledge Document Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#0D182A] border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">
                  Add Bank Knowledge Source
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={titleMm}
                  onChange={(e) => setTitleMm(e.target.value)}
                  placeholder="e.g., ATM Card Lost & Replacement Policy"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none"
                  >
                    <option value="Cards">Cards</option>
                    <option value="Security">Security</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Transfers">Transfers</option>
                    <option value="Loans">Loans</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Approved Banking Policy Content *
                </label>
                <textarea
                  required
                  rows={4}
                  value={contentMm}
                  onChange={(e) => setContentMm(e.target.value)}
                  placeholder="Enter policy details, steps, fees, emergency numbers, and branch instructions..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Search Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="ATM, card, lost, freeze, hotlines"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save & Index for RAG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
