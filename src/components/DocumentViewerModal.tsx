import React, { useState } from 'react';
import { X, Download, FileText, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
  title: string;
}

export const DocumentViewerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
  title
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !fileUrl) return null;

  const isPdf = fileType === 'pdf' || fileUrl.includes('application/pdf') || fileName.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className={`bg-white  rounded-3xl shadow-2xl border border-slate-200  flex flex-col transition-all duration-300 w-full ${
          isFullscreen ? 'h-full max-h-none rounded-none' : 'max-w-5xl h-[90vh]'
        }`}
      >
        {/* Modal Header */}
 <div className="p-4 sm:p-5 border-b border-slate-100  flex items-center justify-between bg-slate-50  rounded-t-3xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
 <h2 className="font-bold text-sm sm:text-base text-slate-800  truncate">
                {title || fileName}
              </h2>
 <div className="flex items-center gap-2 text-[11px] text-slate-500 ">
                <span className="truncate">{fileName || 'Dokumen Pembelajaran'}</span>
                <span>•</span>
 <span className="uppercase font-semibold text-teal-600 ">
                  {isPdf ? 'PDF Document Viewer' : 'Document Viewer'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={fileName || 'materi-dokumen'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title="Download File"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Unduh File</span>
            </a>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-600  hover:bg-slate-200  transition-colors cursor-pointer hidden sm:block"
              title={isFullscreen ? 'Kecilkan' : 'Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700  hover:bg-slate-200  transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Document Previewer */}
 <div className="flex-1 bg-slate-100  p-2 sm:p-4 overflow-hidden flex flex-col">
          {isPdf ? (
 <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200  shadow-inner bg-white  flex flex-col">
              <iframe
                src={`${fileUrl}#toolbar=1&view=FitH`}
                title={fileName}
                className="w-full h-full flex-1"
              />
            </div>
          ) : (
 <div className="w-full h-full rounded-2xl border border-slate-200  bg-white  p-8 flex flex-col items-center justify-center text-center space-y-4">
 <div className="text-5xl"></div>
              <div className="space-y-1 max-w-md">
 <h3 className="font-bold text-base text-slate-800 ">
                  {fileName}
                </h3>
 <p className="text-xs text-slate-500 ">
                  File presentasi atau dokumen ini dapat dibaca langsung dengan mengunduhnya ke perangkat Anda.
                </p>
              </div>
              <a
                href={fileUrl}
                download={fileName || 'materi'}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Dokumen Sekarang</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
