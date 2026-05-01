import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ImageUpload({
  current,
  onChange,
  size = 96,
  rounded = "full",
  fallback,
}: {
  current?: string;
  onChange: (url: string | undefined) => void;
  size?: number;
  rounded?: "full" | "2xl";
  fallback?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("الصورة كبيرة (الحد 5MB)");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("لازم تسجل دخول");
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("snowwolf-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("snowwolf-media").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      toast.error(e.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={() => !uploading && ref.current?.click()}
        disabled={uploading}
        className={`w-full h-full ${rounded === "full" ? "rounded-full" : "rounded-2xl"} overflow-hidden bg-secondary border-2 border-border flex items-center justify-center hover:border-primary transition-colors`}
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : current ? (
          <img src={current} alt="" className="w-full h-full object-cover" />
        ) : (
          fallback || <Camera className="w-8 h-8 text-muted-foreground" />
        )}
        {!uploading && (
          <div className={`absolute inset-0 ${rounded === "full" ? "rounded-full" : "rounded-2xl"} bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center`}>
            <Camera className="w-6 h-6 text-white" />
          </div>
        )}
      </button>
      {current && !uploading && (
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
