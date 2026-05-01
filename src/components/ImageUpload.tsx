import { useRef } from "react";
import { Camera } from "lucide-react";

export default function ImageUpload({
  current,
  onChange,
  size = 96,
  rounded = "full",
  fallback,
}: {
  current?: string;
  onChange: (dataUrl: string | undefined) => void;
  size?: number;
  rounded?: "full" | "2xl";
  fallback?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handle = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("الصورة كبيرة (الحد 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative group" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`w-full h-full ${rounded === "full" ? "rounded-full" : "rounded-2xl"} overflow-hidden bg-secondary border-2 border-border flex items-center justify-center hover:border-primary transition-colors`}
      >
        {current ? (
          <img src={current} alt="" className="w-full h-full object-cover" />
        ) : (
          fallback || <Camera className="w-8 h-8 text-muted-foreground" />
        )}
        <div className={`absolute inset-0 ${rounded === "full" ? "rounded-full" : "rounded-2xl"} bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center`}>
          <Camera className="w-6 h-6 text-white" />
        </div>
      </button>
      {current && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center shadow-soft"
        >
          ×
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
