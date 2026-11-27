import React from 'react';
import type { QuizAsset } from '../types/quiz.js';
import { youtubeEmbedUrl } from '../utils/quizLogic.js';

/**
 * Menampilkan aset yang ditempel guru ke sebuah soal (gambar, audio, kotak teks, YouTube).
 * Dipakai di portal siswa, mesin kuis interaktif, dan analisis jawaban.
 */
export const QuestionAssets: React.FC<{ assets: QuizAsset[]; imageClassName?: string }> = ({
  assets,
  imageClassName = 'w-full max-h-72 object-contain rounded-2xl border border-slate-200 bg-white'
}) => {
  if (!assets || assets.length === 0) return null;

  return (
    <div className="space-y-2">
      {assets.map((asset) => {
        if (asset.type === 'image' && asset.dataUrl) {
          return (
            <img
              key={asset.id}
              src={asset.dataUrl}
              alt={asset.title || 'Gambar pendukung soal'}
              className={imageClassName}
            />
          );
        }

        if (asset.type === 'audio' && asset.dataUrl) {
          return (
            <div
              key={asset.id}
              className="rounded-2xl border border-slate-200 bg-white p-2.5 space-y-1"
            >
              <p className="text-[11px] font-semibold text-slate-600 truncate">
                {asset.title || 'Audio soal'}
              </p>
              <audio src={asset.dataUrl} controls className="w-full" />
            </div>
          );
        }

        if (asset.type === 'text') {
          return (
            <div
              key={asset.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed"
            >
              {asset.title ? (
                <p className="text-[11px] font-bold text-slate-500 mb-1">{asset.title}</p>
              ) : null}
              {asset.content}
            </div>
          );
        }

        if (asset.type === 'youtube' && asset.url) {
          const embed = youtubeEmbedUrl(asset.url);
          if (!embed) {
            return (
              <a
                key={asset.id}
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                className="block text-xs font-semibold text-teal-700 underline break-all"
              >
                {asset.title || asset.url}
              </a>
            );
          }
          return (
            <div
              key={asset.id}
              className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-black"
            >
              <iframe
                src={embed}
                title={asset.title || 'Video YouTube soal'}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default QuestionAssets;
