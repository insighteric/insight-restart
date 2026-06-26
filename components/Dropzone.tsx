"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, ImageIcon, X } from "lucide-react";

export function Dropzone({
  accept = "application/pdf",
  multiple = false,
  files,
  onFiles,
  hint,
}: {
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFiles: (f: File[]) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    onFiles(multiple ? [...files, ...arr] : arr.slice(0, 1));
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          drag ? "border-brand bg-brand-50" : "border-line hover:border-brand-200 hover:bg-surface-2"
        }`}
      >
        <UploadCloud size={26} className={drag ? "text-brand" : "text-faint"} />
        <div className="text-[13px] font-medium text-ink-soft">
          클릭하거나 파일을 끌어다 놓으세요
        </div>
        {hint && <div className="text-[11px] text-faint">{hint}</div>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => pick(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border border-line-soft bg-surface px-3 py-2 text-[13px]">
              {/pdf/i.test(f.type) ? <FileText size={15} className="text-danger" /> : <ImageIcon size={15} className="text-brand" />}
              <span className="min-w-0 flex-1 truncate text-ink-soft">{f.name}</span>
              <span className="text-[11px] text-faint">{(f.size / 1024).toFixed(0)}KB</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFiles(files.filter((_, idx) => idx !== i));
                }}
                className="text-faint hover:text-danger"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
