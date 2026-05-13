import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ImageIcon,
  Loader2,
  RefreshCw,
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
  const canSelect = typeof onSelect === "function";

  const usedBytes = images.reduce((total, image) => total + (image.metadata?.size || 0), 0);
  const remainingBytes = Math.max(0, MAX_IMAGE_STORAGE_BYTES - usedBytes);
  const usedPercent = Math.min(100, (usedBytes / MAX_IMAGE_STORAGE_BYTES) * 100);

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

  return (
    <div className="fixed inset-0 z-50 bg-d-bg text-d-fg flex flex-col">
      <header className="h-16 border-b border-line bg-d-panel flex items-center px-6">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.22em] text-d-pink font-semibold">
            Gestionnaire d'images
          </div>
          <div
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Sélection et import Supabase
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || uploading}
            className="h-9 w-9 inline-flex items-center justify-center border border-line rounded-lg text-d-fg3 hover:text-d-fg hover:border-line2 disabled:opacity-50 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center border border-line rounded-lg text-d-fg3 hover:text-d-fg hover:border-line2 transition-colors"
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-[minmax(280px,360px)_1fr]">
        <aside className="border-r border-line bg-d-panel p-5 overflow-y-auto">
          <div
            {...dropHandlers}
            className={`border border-dashed rounded-2xl p-6 min-h-[260px] flex flex-col items-center justify-center text-center transition-colors ${
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

        <section className="overflow-y-auto p-6">
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
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {images.map((image) => {
                const selected = canSelect && image.path === currentPath;
                return (
                  <article
                    key={image.path}
                    className={`group border rounded-2xl overflow-hidden bg-d-panel transition-colors ${
                      selected ? "border-d-pink" : "border-line hover:border-line2"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (canSelect) onSelect({ url: image.url, path: image.path });
                      }}
                      className={`relative block w-full aspect-[4/3] bg-d-panel2 overflow-hidden ${
                        canSelect ? "" : "cursor-default"
                      }`}
                      title={canSelect ? "Sélectionner cette image" : image.name}
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
                    <div className="p-3">
                      <div className="text-xs font-semibold text-d-fg2 truncate mb-1">
                        {image.name}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[11px] text-d-fg4">
                        <span>{formatBytes(image.metadata?.size)}</span>
                        <span>{formatDate(image.updated_at || image.created_at)}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {canSelect && (
                          <button
                            type="button"
                            onClick={() => onSelect({ url: image.url, path: image.path })}
                            className="flex-1 px-3 py-2 rounded-lg border border-line text-[10px] uppercase tracking-[0.18em] text-d-fg2 hover:text-d-fg hover:border-line2 transition-colors"
                          >
                            Sélectionner
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(image)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-line text-d-fg4 hover:text-red-400 hover:border-red-500/30 hover:bg-red-950/20 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
