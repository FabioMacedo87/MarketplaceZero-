import React, { useEffect, useRef, useState } from 'react';
import { Compass, MapPin, MoveHorizontal, Navigation, X, ZoomIn, ZoomOut } from 'lucide-react';
import { PORTO_REAL_PLACES, getPortoRealPlace } from '../game/portoRealData.ts';

interface PortoRealModalProps {
  open: boolean;
  initialBuildingId: string | null;
  onClose: () => void;
  onNavigateToBuilding: (buildingId: string) => void;
}

export const PortoRealModal: React.FC<PortoRealModalProps> = ({
  open,
  initialBuildingId,
  onClose,
  onNavigateToBuilding,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialBuildingId ?? PORTO_REAL_PLACES[0].buildingId,
  );
  const [panX, setPanX] = useState(50);
  const [zoomed, setZoomed] = useState(false);
  const draggingRef = useRef<{ startX: number; startPan: number } | null>(null);

  useEffect(() => {
    if (open && initialBuildingId) {
      setSelectedId(initialBuildingId);
      setPanX(50);
      setZoomed(false);
    }
  }, [open, initialBuildingId]);

  if (!open) return null;

  const place = getPortoRealPlace(selectedId);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = { startX: e.clientX, startPan: panX };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - draggingRef.current.startX;
    const next = Math.max(0, Math.min(100, draggingRef.current.startPan - dx * 0.16));
    setPanX(next);
  };

  const handlePointerUp = () => {
    draggingRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070B13]/96 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0F172A] border border-white/15 rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Rua Real do Porto · Guia Fotográfico da Cidade</span>
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white truncate mt-0.5">
              {place.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar vista real"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6">
          {/* Left: Interactive Real Street Photo Pan Viewer */}
          <div className="lg:col-span-8 space-y-3">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/15 bg-slate-950 select-none cursor-grab active:cursor-grabbing touch-none"
            >
              <img
                src={place.photoUrl}
                alt={place.photoCaption}
                referrerPolicy="no-referrer"
                draggable={false}
                className="w-full h-full object-cover transition-transform duration-200"
                style={{
                  objectPosition: `${panX}% 50%`,
                  transform: zoomed ? 'scale(1.45)' : 'scale(1.06)',
                }}
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent p-3 sm:p-4 flex items-end justify-between gap-3 pointer-events-none">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{place.streetAddress}</span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                    {place.photoCaption}
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-white/15 text-[11px] text-slate-200 shrink-0">
                  <MoveHorizontal className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  Arraste para explorar a rua
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomed((z) => !z);
                }}
                aria-label={zoomed ? 'Reduzir zoom' : 'Ampliar imagem da rua'}
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-slate-950/85 border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-slate-900 cursor-pointer"
              >
                {zoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                <span>{zoomed ? '1x' : '1.5x'}</span>
              </button>
            </div>

            {/* Real Street Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-sky-300">{place.coordinates}</span>
                <span className="text-amber-300 font-semibold">{place.era}</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{place.description}</p>
              <ul className="space-y-1.5 pt-1">
                {place.highlights.map((h, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Directory of Real Porto Streets & Monuments */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-300">
              Locais Reais do Porto e Gaia ({PORTO_REAL_PLACES.length})
            </p>
            <div className="space-y-1.5 max-h-[340px] lg:max-h-[400px] overflow-y-auto pr-1">
              {PORTO_REAL_PLACES.map((item) => {
                const active = item.buildingId === place.buildingId;
                return (
                  <button
                    key={item.buildingId}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.buildingId);
                      setPanX(50);
                      setZoomed(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    <p className="text-xs font-bold truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.streetAddress}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onNavigateToBuilding(place.buildingId);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Navigation className="w-4 h-4" aria-hidden="true" />
                <span>Guiar GPS 3D até este local</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Voltar às Ruas do Porto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
