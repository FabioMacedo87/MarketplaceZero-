import React from 'react';
import { BookOpen, CheckCircle2, ChevronRight, Play, X } from 'lucide-react';
import { STORY_CHAPTERS } from '../game/storyData.ts';
import type { StoryDialogueSnapshot } from '../game/types.ts';

interface StoryDialogueBarProps {
  dialogue: StoryDialogueSnapshot;
  isMobile: boolean;
  onAdvance: () => void;
  onSkip: () => void;
}

export const StoryDialogueBar: React.FC<StoryDialogueBarProps> = ({
  dialogue,
  isMobile,
  onAdvance,
  onSkip,
}) => {
  const { line } = dialogue;
  const initial = line.speakerName.charAt(0).toUpperCase();

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-30 w-[calc(100%-24px)] max-w-2xl rounded-xl bg-[#090D16]/95 border border-white/15 shadow-2xl px-4 py-3 ${
        isMobile ? 'top-[104px]' : 'bottom-20'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-display font-bold text-base text-slate-950"
          style={{ backgroundColor: line.accentHex }}
          aria-hidden="true"
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="font-semibold text-white">{line.speakerName}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{line.role}</span>
            </div>
            <span className="font-mono tabular-nums shrink-0">
              {dialogue.index + 1}/{dialogue.total}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-100 leading-snug">{line.text}</p>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 truncate">
              {dialogue.chapterTitle}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onSkip}
                className="min-h-[36px] px-3 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Ignorar
              </button>
              <button
                type="button"
                onClick={onAdvance}
                className="min-h-[36px] px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>
                  {dialogue.index + 1 < dialogue.total
                    ? isMobile
                      ? 'Avançar'
                      : 'Avançar [Enter]'
                    : isMobile
                      ? 'Começar'
                      : 'Começar [Enter]'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StoryCampaignModalProps {
  open: boolean;
  currentChapter: number;
  completedChapters: number[];
  onClose: () => void;
  onSelectChapter: (chapterNumber: number) => void;
}

export const StoryCampaignModal: React.FC<StoryCampaignModalProps> = ({
  open,
  currentChapter,
  completedChapters,
  onClose,
  onSelectChapter,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-[#05070D]/90 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0F1623] border border-white/15 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>Campanha Principal · Porto & Vila Nova de Gaia</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5 truncate">
              Crónicas do Douro: A Rede dos Azulejos
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-emerald-400 tabular-nums hidden sm:inline">
              {completedChapters.length}/5 concluídos
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar janela de história"
              className="min-h-[40px] min-w-[40px] rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {STORY_CHAPTERS.map((ch) => {
            const isCompleted = completedChapters.includes(ch.chapterNumber);
            const isCurrent = currentChapter === ch.chapterNumber;

            return (
              <div
                key={ch.chapterNumber}
                className={`p-4 rounded-xl border transition-colors ${
                  isCurrent
                    ? 'bg-slate-900/95 border-amber-400/50'
                    : 'bg-slate-900/55 border-white/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-amber-300 font-semibold">
                        0{ch.chapterNumber}.
                      </span>
                      <span className="truncate">{ch.districtTag}</span>
                      {isCompleted && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-400 inline-flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Concluído
                          </span>
                        </>
                      )}
                      {isCurrent && !isCompleted && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-400 font-medium">Em curso</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white mt-1">
                      {ch.subtitle}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      {ch.synopsis}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectChapter(ch.chapterNumber);
                      onClose();
                    }}
                    className={`min-h-[42px] px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{isCompleted ? 'Repetir' : isCurrent ? 'Retomar' : 'Jogar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
