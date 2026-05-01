import { User, api, randomColor } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import ImageUpload from "./ImageUpload";
import Avatar from "./Avatar";
import { Circle, Moon, MinusCircle, EyeOff } from "lucide-react";

const STATUSES = [
  { value: "online", label: "متصل", icon: Circle, color: "text-success" },
  { value: "idle", label: "غير نشط", icon: Moon, color: "text-yellow-500" },
  { value: "dnd", label: "مشغول", icon: MinusCircle, color: "text-destructive" },
  { value: "invisible", label: "خفي", icon: EyeOff, color: "text-muted-foreground" },
] as const;

export default function UserSettings({
  user, open, onClose,
}: { user: User; open: boolean; onClose: () => void }) {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || "");
  const [customStatus, setCustomStatus] = useState(user.customStatus || "");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatarUrl);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [status, setStatus] = useState(user.status);
  const [password, setPassword] = useState("");

  const save = () => {
    try {
      api.updateProfile({ username, bio, customStatus, avatarUrl, avatarColor, status, ...(password ? { password } : {}) });
      toast.success("تم الحفظ");
      setPassword("");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">إعدادات الحساب</DialogTitle>
        </DialogHeader>

        {/* Banner with avatar */}
        <div className="relative -mx-6 mb-12">
          <div className="h-24 bg-gradient-ice" />
          <div className="absolute -bottom-10 right-6 p-1 bg-card rounded-full">
            <ImageUpload
              current={avatarUrl}
              onChange={setAvatarUrl}
              size={96}
              fallback={<Avatar user={{ ...user, avatarUrl: undefined, avatarColor }} size="xl" />}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">اسم المستخدم</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-secondary border-border" maxLength={24} />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">نبذة عنك</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-secondary border-border" maxLength={200} placeholder="حدّث الناس عن نفسك..." />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">حالة مخصصة</label>
            <Input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} className="bg-secondary border-border" maxLength={50} placeholder="مثلاً: بألعب 🎮" />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">الحالة</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                      status === s.value ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-muted-foreground"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${s.color}`} fill="currentColor" />
                    <span className="text-sm font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">لون الأفاتار الافتراضي</label>
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor}`} />
              <Button type="button" variant="outline" onClick={() => setAvatarColor(randomColor())}>
                لون عشوائي
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">كلمة سر جديدة (اختياري)</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary border-border" placeholder="اتركها فاضية لو مش هتغيرها" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">إلغاء</Button>
            <Button onClick={save} className="flex-1 bg-gradient-ice text-primary-foreground">حفظ</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
