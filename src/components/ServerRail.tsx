import { Server, api } from "@/lib/store";
import { Plus, LogOut, UserPlus, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/assets/snowwolf-logo.png";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Avatar from "./Avatar";
import { User } from "@/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  servers: Server[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  me: User;
};

export default function ServerRail({ servers, activeId, onSelect, onCreate, onLogout, onOpenSettings, me }: Props) {
  const [joining, setJoining] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [code, setCode] = useState("");

  const join = async () => {
    try {
      const sid = await api.joinServerByInvite(code);
      toast.success("اتم الانضمام");
      setCode("");
      setJoining(false);
      onSelect(sid);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <aside className="w-[78px] bg-rail flex flex-col items-center py-4 gap-2 border-l border-border/50 z-10">
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => onSelect("")} className={`relative w-12 h-12 rounded-2xl overflow-hidden bg-card flex items-center justify-center mb-1 transition-all hover:rounded-xl ${activeId === "" ? "rounded-xl shadow-ice ring-2 ring-primary" : "shadow-ice"}`}>
            <img src={logo} alt="SnowWolf" className="w-full h-full object-cover" />
            {activeId === "" && <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-l-full" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">SnowWolf — الرئيسية</TooltipContent>
      </Tooltip>

      <div className="w-8 h-px bg-border my-1" />

      <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-thin w-full items-center">
        {servers.map((s) => {
          const active = s.id === activeId;
          return (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect(s.id)}
                  className={`relative w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center font-display font-black text-lg text-white transition-all hover:rounded-xl ${
                    active ? "rounded-xl shadow-ice ring-2 ring-primary" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  {s.iconUrl ? (
                    <img src={s.iconUrl} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${s.iconColor} flex items-center justify-center`}>
                      {s.name.slice(0, 2)}
                    </div>
                  )}
                  {active && (
                    <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-l-full" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">{s.name}</TooltipContent>
            </Tooltip>
          );
        })}

        <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="w-12 h-12 rounded-2xl bg-secondary text-success flex items-center justify-center hover:bg-success hover:text-success-foreground hover:rounded-xl transition-all">
                  <Plus className="w-6 h-6" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">إضافة سيرفر</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="left" className="bg-popover border-border">
            <DropdownMenuItem onClick={() => { setPickerOpen(false); onCreate(); }}>
              <Plus className="w-4 h-4 ml-2" /> إنشاء سيرفر
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setPickerOpen(false); setJoining(true); }}>
              <UserPlus className="w-4 h-4 ml-2" /> الانضمام بكود
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onOpenSettings} className="w-12 h-12 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center hover:bg-card hover:text-primary hover:rounded-xl transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">إعدادات الحساب</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onOpenSettings} className="rounded-full hover:rounded-2xl transition-all">
            <Avatar user={me} size="md" showStatus />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">{me.username}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onLogout} className="w-12 h-12 rounded-2xl bg-secondary text-destructive flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground hover:rounded-xl transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">خروج</TooltipContent>
      </Tooltip>

      <Dialog open={joining} onOpenChange={setJoining}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>الانضمام لسيرفر</DialogTitle>
          </DialogHeader>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ادخل كود الدعوة" className="bg-secondary border-border h-12 text-center font-mono tracking-widest" />
          <Button onClick={join} className="bg-gradient-ice text-primary-foreground">انضمام</Button>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
