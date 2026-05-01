import { Server, api } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import ImageUpload from "./ImageUpload";
import { Copy, Trash2 } from "lucide-react";

export default function ServerSettings({
  server, isOwner, open, onClose, onDeleted,
}: {
  server: Server;
  isOwner: boolean;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(server.name);
  const [iconUrl, setIconUrl] = useState<string | undefined>(server.iconUrl);

  const save = () => {
    api.updateServer(server.id, { name, iconUrl });
    toast.success("تم الحفظ");
    onClose();
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(server.inviteCode);
    toast.success("تم نسخ كود الدعوة");
  };

  const del = () => {
    if (!confirm(`متأكد إنك عايز تحذف ${server.name}؟`)) return;
    try {
      api.deleteServer(server.id);
      toast.success("تم الحذف");
      onDeleted();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">إعدادات السيرفر</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center my-2">
          <ImageUpload current={iconUrl} onChange={setIconUrl} size={96} rounded="2xl" />
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">اسم السيرفر</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} className="bg-secondary border-border" maxLength={50} />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">كود الدعوة</label>
            <div className="flex gap-2">
              <Input value={server.inviteCode} readOnly className="bg-secondary border-border font-mono text-center tracking-widest" />
              <Button onClick={copyInvite} variant="outline" size="icon"><Copy className="w-4 h-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">شارك الكود ده عشان حد ينضم</p>
          </div>

          {isOwner && (
            <Button onClick={del} variant="destructive" className="w-full gap-2">
              <Trash2 className="w-4 h-4" /> حذف السيرفر
            </Button>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">إغلاق</Button>
            {isOwner && (
              <Button onClick={save} className="flex-1 bg-gradient-ice text-primary-foreground">حفظ</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
