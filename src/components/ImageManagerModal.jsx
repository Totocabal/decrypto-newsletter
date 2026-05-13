import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckSquare,
  Grid2X2,
  Grid3X3,
  ImageIcon,
  List,
  Loader2,
  RefreshCw,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  deleteImage,
  listImages,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_IMAGE_FILE_SIZE_LABEL,
  MAX_IMAGE_STORAGE_BYTES,
  MAX_IMAGE_STORAGE_LABEL,
  uploadImage,
} from "../lib/imageUpload.js";
import { Tooltip } from "./Tooltip.jsx";

function formatBytes(bytes = 0) {
  if (!bytes) return "Taille inconnue";
  const units = ["o", "ko", "Mo", "Go"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toLocaleString("fr-FR", { maximumFractionDigits: unit ? 1 : 0 })} ${units[unit]}`;
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Compression impossible pour cette image."));
      },
      type
    );
  });
}

async function compressImage(file, options = {}) {
  const { maxWidth = 1600 } = options;
  if (!file?.type?.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;

  const img = await fileToImage(file);
  let ratio = Math.min(1, maxWidth / img.naturalWidth);
  let compressed = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const width = Math.max(1, Math.round(img.naturalWidth * ratio));
    const height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    compressed = await canvasToBlob(canvas, "image/png");
    if (compressed.size <= MAX_IMAGE_FILE_SIZE_BYTES) break;
    ratio *= 0.8;
  }

  if (!compressed || (file.size <= MAX_IMAGE_FILE_SIZE_BYTES && compressed.size >= file.size)) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([compressed], `${baseName}-compresse.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}

export function ImageManagerModal({ currentPath, onClose, onSelect, userId }) {
  const inputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [compressBeforeUpload, setCompressBeforeUpload] = useState(true);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [viewMode, setViewMode] = useState("grid4");
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const canSelect = typeof onSelect === "function";

  const usedBytes = images.reduce((total, image) => total + (image.metadata?.size || 0), 0);
  const remainingBytes = Math.max(0, MAX_IMAGE_STORAGE_BYTES - usedBytes);
  const usedPercent = Math.min(100, (usedBytes / MAX_IMAGE_STORAGE_BYTES) * 100);
  const selectedCount = selectedPaths.length;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setImages(await listImages(userId));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = async (files) => {
    const fileList = Array.from(files || []).filter(Boolean);
    if (!fileList.length || !userId) return;
    setUploading(true);
    setError(null);
    setUploadNotice(null);
    try {
      const uploaded = [];
      let projectedUsedBytes = usedBytes;
      for (const file of fileList) {
        let uploadFile = file;
        if (compressBeforeUpload || file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
          uploadFile = await compressImage(file);
          if (uploadFile.size < file.size) {
            setUploadNotice(
              `Compression : ${formatBytes(file.size)} → ${formatBytes(uploadFile.size)}`
            );
          }
        }
        if (uploadFile.size > MAX_IMAGE_FILE_SIZE_BYTES) {
          throw new Error(
            `${file.name} reste trop lourde (${formatBytes(uploadFile.size)}). Max ${MAX_IMAGE_FILE_SIZE_LABEL}.`
          );
        }
        if (projectedUsedBytes + uploadFile.size > MAX_IMAGE_STORAGE_BYTES) {
          throw new Error(
            `Stockage insuffisant : il reste ${formatBytes(remainingBytes)} sur ${MAX_IMAGE_STORAGE_LABEL}.`
          );
        }
        projectedUsedBytes += uploadFile.size;
        uploaded.push(await uploadImage(uploadFile, userId));
      }
      await refresh();
      if (uploaded.length === 1 && canSelect) onSelect(uploaded[0]);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (image) => {
    if (!image?.path) return;
    if (!confirm(`Supprimer "${image.name}" du gestionnaire d'images ?`)) return;
    setError(null);
    try {
      await deleteImage(image.path);
      setImages((items) => items.filter((item) => item.path !== image.path));
      setSelectedPaths((paths) => paths.filter((path) => path !== image.path));
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedPaths.length) return;
    if (!confirm(`Supprimer ${selectedPaths.length} image(s) du gestionnaire ?`)) return;
    setError(null);
    try {
      await Promise.all(selectedPaths.map((path) => deleteImage(path)));
      setImages((items) => items.filter((item) => !selectedPaths.includes(item.path)));
      setSelectedPaths([]);
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const dropHandlers = {
    onDragEnter: (event) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragOver: (event) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event) => {
      if (event.currentTarget === event.target) setDragging(false);
    },
    onDrop: (event) => {
      event.preventDefault();
      setDragging(false);
      handleUpload(event.dataTransfer.files);
    },
  };

  const viewModes = [
    { id: "grid4", label: "4", title: "Grille 4 images", icon: Grid2X2 },
    { id: "grid8", label: "8", title: "Grille 8 images", icon: Grid3X3 },
    { id: "grid16", label: "16", title: "Grille 16 images", icon: Grid3X3 },
    { id: "list", label: "Liste", title: "Vue liste", icon: List },
  ];

  const selectImage = (image) => {
    if (multiSelect) {
      toggleImageSelection(image.path);
      return;
    }
    if (canSelect) onSelect({ url: image.url, path: image.path });
  };

  const toggleImageSelection = (path) => {
    setSelectedPaths((paths) =>
      paths.includes(path)
        ? paths.filter((item) => item !== path)
        : [...paths, path]
    );
  };

  const toggleSelectAll = () => {
    setSelectedPaths((paths) =>
      paths.length === images.length ? [] : images.map((image) => image.path)
    );
  };

  const renderSelectionButton = (image, className = "") => {
    const checked = selectedPaths.includes(image.path);
    const Icon = checked ? CheckSquare : Square;
    return (
      <Tooltip label={checked ? "Désélectionner" : "Sélectionner pour suppression"}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toggleImageSelection(image.path);
        }}
        className={`inline-flex items-center justify-center rounded-lg border transition-colors ${
          checked
            ? "border-d-pink bg-d-pink text-white"
            : "border-line bg-d-panel/90 text-d-fg3 hover:text-d-fg hover:border-line2"
        } ${className}`}
      >
        <Icon size={14} />
      </button>
      </Tooltip>
    );
  };

  const renderImageCard = (image, density = "default") => {
    const selected = canSelect && image.path === currentPath;
    const compact = density === "compact" || density === "micro";
    const micro = density === "micro";
    return (
      <article
        key={image.path}
        className={`group border rounded-2xl overflow-hidden bg-d-panel transition-colors ${
          selected ? "border-d-pink" : "border-line hover:border-line2"
        }`}
      >
        <div className="relative">
          <Tooltip label={canSelect ? "Sélectionner cette image" : image.name} className="w-full">
            <button
              type="button"
              onClick={() => selectImage(image)}
              className={`block w-full aspect-[4/3] bg-d-panel2 overflow-hidden ${
                canSelect || multiSelect ? "" : "cursor-default"
              }`}
            >
              <img
                src={image.url}
                alt={image.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                loading="lazy"
              />
              {selected && (
                <span className="absolute top-3 left-3 h-7 w-7 rounded-full bg-d-pink text-white inline-flex items-center justify-center">
                  <Check size={15} />
                </span>
              )}
            </button>
          </Tooltip>
          {(multiSelect || selectedPaths.includes(image.path)) &&
            renderSelectionButton(image, "absolute top-2 right-2 h-7 w-7")}
        </div>
        {!micro && (
          <div className={compact ? "p-2" : "p-3"}>
            <div className="text-xs font-semibold text-d-fg2 truncate mb-1">
              {image.name}
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] text-d-fg4">
              <span>{formatBytes(image.metadata?.size)}</span>
              {!compact && <span>{formatDate(image.updated_at || image.created_at)}</span>}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {(multiSelect || selectedPaths.includes(image.path)) &&
                renderSelectionButton(image, "h-8 w-8")}
              {canSelect && (
                <button
                  type="button"
                  onClick={() => selectImage(image)}
                  className="flex-1 px-3 py-2 rounded-lg border border-line text-[10px] uppercase tracking-[0.18em] text-d-fg2 hover:text-d-fg hover:border-line2 transition-colors"
                >
                  Sélectionner
                </button>
              )}
              <Tooltip label="Supprimer">
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-line text-d-fg4 hover:text-red-400 hover:border-red-500/30 hover:bg-red-950/20 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </Tooltip>
            </div>
          </div>
        )}
        {micro && (
          <div className="p-1.5 flex items-center justify-between gap-1">
            <span className="text-[10px] text-d-fg4 truncate">{formatBytes(image.metadata?.size)}</span>
            {(multiSelect || selectedPaths.includes(image.path)) ? (
              renderSelectionButton(image, "h-7 w-7 flex-shrink-0")
            ) : (
              <Tooltip label="Supprimer">
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-line text-d-fg4 hover:text-red-400 hover:border-red-500/30 hover:bg-red-950/20 transition-colors flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </article>
    );
  };

  const renderImageRow = (image) => {
    const selected = canSelect && image.path === currentPath;
    return (
      <article
        key={image.path}
        className={`flex items-center gap-4 border rounded-2xl bg-d-panel p-3 transition-colors ${
          selected ? "border-d-pink" : "border-line hover:border-line2"
        }`}
      >
        <Tooltip label={canSelect ? "Sélectionner cette image" : image.name}>
          <button
            type="button"
            onClick={() => selectImage(image)}
            className={`relative h-20 w-28 rounded-xl overflow-hidden bg-d-panel2 flex-shrink-0 ${
              canSelect ? "" : "cursor-default"
            }`}
          >
            <img src={image.url} alt={image.name} className="h-full w-full object-cover" loading="lazy" />
            {selected && (
              <span className="absolute top-2 left-2 h-6 w-6 rounded-full bg-d-pink text-white inline-flex items-center justify-center">
                <Check size={13} />
              </span>
            )}
          </button>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-d-fg2 truncate">{image.name}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-d-fg4">
            <span>{formatBytes(image.metadata?.size)}</span>
            <span>{formatDate(image.updated_at || image.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(multiSelect || selectedPaths.includes(image.path)) &&
            renderSelectionButton(image, "h-9 w-9")}
          {canSelect && (
            <button
              type="button"
              onClick={() => selectImage(image)}
              className="px-3 py-2 rounded-lg border border-line text-[10px] uppercase tracking-[0.18em] text-d-fg2 hover:text-d-fg hover:border-line2 transition-colors"
            >
              Sélectionner
            </button>
          )}
          <Tooltip label="Supprimer" align="right">
            <button
              type="button"
              onClick={() => handleDelete(image)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-line text-d-fg4 hover:text-red-400 hover:border-red-500/30 hover:bg-red-950/20 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </article>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-d-bg text-d-fg flex flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-d-panel px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.22em] text-d-pink font-semibold">
            Gestionnaire d'images
          </div>
          <div
            className="truncate text-base font-semibold tracking-tight sm:text-lg"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Sélection et import Supabase
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Tooltip label="Rafraîchir">
            <button
              type="button"
              onClick={refresh}
              disabled={loading || uploading}
              className="h-9 w-9 inline-flex items-center justify-center border border-line rounded-lg text-d-fg3 hover:text-d-fg hover:border-line2 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </Tooltip>
          <Tooltip label="Fermer" align="right">
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center border border-line rounded-lg text-d-fg3 hover:text-d-fg hover:border-line2 transition-colors"
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(280px,360px)_1fr] lg:overflow-hidden">
        <aside className="border-b border-line bg-d-panel p-4 sm:p-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div
            {...dropHandlers}
            className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition-colors sm:min-h-[260px] sm:p-6 ${
              dragging
                ? "border-d-pink bg-d-pink/10"
                : "border-line bg-d-panel2 hover:border-line2"
            }`}
          >
            <div className="h-14 w-14 rounded-2xl border border-line bg-d-panel flex items-center justify-center mb-4">
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-d-pink" />
              ) : (
                <Upload size={24} className="text-d-fg3" />
              )}
            </div>
            <div className="text-sm font-semibold text-d-fg2 mb-2">
              Importer une image
            </div>
            <div className="text-xs text-d-fg4 leading-relaxed mb-5">
              Dépose une ou plusieurs images ici, ou sélectionne-les depuis ton ordinateur.
              Max {MAX_IMAGE_FILE_SIZE_LABEL} par image. Stockage total : {MAX_IMAGE_STORAGE_LABEL}.
            </div>
            <label className="mb-5 flex items-center gap-2 text-[11px] text-d-fg3 cursor-pointer">
              <input
                type="checkbox"
                checked={compressBeforeUpload}
                onChange={(event) => setCompressBeforeUpload(event.target.checked)}
                className="accent-d-pink"
              />
              Proposer une version compressée avant l'upload
            </label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-full bg-white text-d-bg text-[11px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50"
            >
              Choisir des fichiers
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              onChange={(event) => handleUpload(event.target.files)}
              className="hidden"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-xl p-3 text-[11px] leading-relaxed text-red-300 border border-red-500/20 bg-red-950/20">
              {error}
            </div>
          )}
          {uploadNotice && (
            <div className="mt-4 rounded-xl p-3 text-[11px] leading-relaxed text-d-green border border-d-green/20 bg-d-green/10">
              {uploadNotice}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-line bg-d-panel2 p-4">
            <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-d-fg3 mb-3">
              <span>Stockage</span>
              <span>{usedPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-d-panel3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-d-cyan via-d-blue to-d-pink"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-d-fg4">
              <div>
                Utilisé<br />
                <span className="text-d-fg2">{formatBytes(usedBytes)}</span>
              </div>
              <div className="text-right">
                Restant<br />
                <span className="text-d-fg2">{formatBytes(remainingBytes)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-[11px] leading-relaxed text-d-fg4">
            Les images sont stockées dans le bucket public{" "}
            <span className="text-d-fg3">newsletter-images</span>.{" "}
            {canSelect
              ? "L'URL sélectionnée est utilisée directement dans la newsletter."
              : "Tu peux importer, contrôler l'espace utilisé et supprimer les images inutiles."}
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg4">
                Bibliothèque
              </div>
              <div className="text-sm text-d-fg2">
                {images.length} image{images.length > 1 ? "s" : ""}
                {selectedCount > 0 && (
                  <span className="text-d-pink"> · {selectedCount} sélectionnée{selectedCount > 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
              <div className="flex flex-shrink-0 items-center gap-1 rounded-xl border border-line bg-d-panel p-1">
                {viewModes.map((mode) => {
                  const Icon = mode.icon;
                  const active = viewMode === mode.id;
                  return (
                    <Tooltip key={mode.id} label={mode.title} side="bottom">
                      <button
                        type="button"
                        onClick={() => setViewMode(mode.id)}
                        className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                          active
                            ? "bg-d-panel3 text-d-fg"
                            : "text-d-fg4 hover:text-d-fg2"
                        }`}
                      >
                        <Icon size={13} />
                        {mode.label}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMultiSelect((active) => !active);
                  if (multiSelect) setSelectedPaths([]);
                }}
                className={`h-10 flex-shrink-0 rounded-xl border px-3 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  multiSelect
                    ? "border-d-pink bg-d-pink/10 text-d-pink"
                    : "border-line text-d-fg3 hover:text-d-fg2 hover:border-line2"
                }`}
              >
                Sélection
              </button>
              {multiSelect && (
                <>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    disabled={images.length === 0}
                    className="h-10 flex-shrink-0 rounded-xl border border-line px-3 text-[10px] uppercase tracking-[0.16em] text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg2 disabled:opacity-40"
                  >
                    {selectedCount === images.length && images.length > 0 ? "Tout retirer" : "Tout sélectionner"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={selectedCount === 0}
                    className="h-10 flex-shrink-0 rounded-xl border border-red-500/30 px-3 text-[10px] uppercase tracking-[0.16em] text-red-300 transition-colors hover:bg-red-950/20 disabled:opacity-40"
                  >
                    Supprimer ({selectedCount})
                  </button>
                </>
              )}
            </div>
          </div>
          {loading ? (
            <div className="h-full min-h-[360px] flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-d-fg3">
              <Loader2 size={14} className="animate-spin" />
              Chargement des images…
            </div>
          ) : images.length === 0 ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center border border-dashed border-line rounded-2xl">
              <ImageIcon size={34} className="text-d-fg4 mb-4" />
              <div className="text-sm text-d-fg2 mb-1">Aucune image importée</div>
              <div className="text-xs text-d-fg4">
                Ajoute une image depuis la zone d'import à gauche.
              </div>
            </div>
          ) : (
            <>
              {viewMode === "grid4" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {images.map((image) => renderImageCard(image))}
                </div>
              )}
              {viewMode === "grid8" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                  {images.map((image) => renderImageCard(image, "compact"))}
                </div>
              )}
              {viewMode === "grid16" && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 2xl:grid-cols-[repeat(16,minmax(0,1fr))]">
                  {images.map((image) => renderImageCard(image, "micro"))}
                </div>
              )}
              {viewMode === "list" && (
                <div className="space-y-3">
                  {images.map((image) => renderImageRow(image))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
