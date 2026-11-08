import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Search,
  Filter,
  Download,
  FileText,
  Image,
  Shield,
  Layers,
  Building,
} from 'lucide-react';
import { FileItem, FileFolder, Client } from '../types/index.ts';
import { getFiles, getClients } from '../data/repo.ts';

export const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [folderFilter, setFolderFilter] = useState<'all' | FileFolder>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getFiles(), getClients()]).then(([f, clis]) => {
      setFiles(f);
      const cMap: Record<string, Client> = {};
      clis.forEach((c) => {
        cMap[c.id] = c;
      });
      setClients(cMap);
      setLoading(false);
    });
  }, []);

  const filteredFiles = files.filter((f) => {
    if (folderFilter !== 'all' && f.folder !== folderFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const clientName = clients[f.clientId]?.businessName || '';
      return f.name.toLowerCase().includes(q) || clientName.toLowerCase().includes(q);
    }
    return true;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Client Files & Assets
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Centralised drive containing brand assets, clinical premise photography, legal agreements, and deliverables.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or practice..."
              className="w-full bg-[#F4F2F2] rounded-full pl-9 pr-4 py-2 text-xs text-[#111111] placeholder-[#A8A5A5] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F4F2F2] p-1 rounded-full text-xs">
            {(['all', 'Brand', 'Photos', 'Content', 'Legal', 'Deliverables'] as const).map((fol) => (
              <button
                key={fol}
                type="button"
                onClick={() => setFolderFilter(fol)}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  folderFilter === fol
                    ? 'bg-white text-[#111111] shadow-xs font-bold'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                {fol === 'all' ? 'All Folders' : fol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Files Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-black/5">
          <h2 className="text-sm font-bold text-[#111111]">Document & Asset Vault</h2>
          <p className="text-xs text-[#6B6B6B]">Asset management across all clinic workspaces.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                <th className="py-3 px-5">File Name</th>
                <th className="py-3 px-4">Clinic / Practice</th>
                <th className="py-3 px-4">Folder</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredFiles.map((file) => {
                const client = clients[file.clientId];
                return (
                  <tr key={file.id} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#111111]">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-[#D92D50] shrink-0" />
                        <span className="truncate max-w-xs">{file.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[#111111]">
                      {client?.businessName || file.clientId}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F4F2F2] font-semibold text-[11px] text-[#444444]">
                        {file.folder}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#6B6B6B]">
                      {formatSize(file.sizeBytes)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold ${
                          file.direction === 'From client' ? 'text-[#D92D50]' : 'text-emerald-700'
                        }`}
                      >
                        {file.direction}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#6B6B6B]">
                      {file.uploadedAt}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => alert(`Downloading mock asset: ${file.name}`)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-black/10 text-[11px] font-semibold text-[#6B6B6B] hover:text-[#111111] hover:border-black/30 transition-colors cursor-pointer"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
