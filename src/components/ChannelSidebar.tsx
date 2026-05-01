import { Channel, Server, User, api } from "@/lib/store";
import { useDB } from "@/hooks/useDB";
import { Hash, Volume2, Plus, ChevronDown, ChevronLeft, Mic, MicOff, PhoneOff, Settings, Trash2, Edit2, Copy, LogOut, FolderPlus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import Avatar from "./Avatar";
import { toast } from "sonner";

type Props = {
  server: Server;
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (id: string) => void;
  voiceChannelId: string | null;
  micOn: boolean;
  onToggleMic: () => void;
  onLeaveVoice: () => void;
  onJoinVoice: (id: string) => void;
  me: User;
  onOpenServerSettings: () => void;
  onOpenUserSettings: () => void;
  onLeaveServer: () => void;
};

export default function ChannelSidebar({
  server, channels, activeChannelId, onSelectChannel,
  voiceChannelId, micOn, onToggleMic, onLeaveVoice, onJoinVoice, me,
  onOpenServerSettings, onOpenUserSettings, onLeaveServer,
}: Props) {
  const db = useDB();
  const [creating, setCreating] = useState<{ type: "text" | "voice"; category?: string } | null>(null);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<Channel | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const myRole = server.members.find((m) => m.userId === me.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = server.ownerId === me.id;

  const reads = db.reads[me.id] || {};
  const unreadFor = (channelId: string) => {
    const last = reads[channelId] || 0;
    return db.messages.some((m) => m.channelId === channelId && m.userId !== me.id && m.createdAt > last);
  };
  const mentionCount = (channelId: string) => {
    const last = reads[channelId] || 0;
    return db.messages.filter((m) => m.channelId === channelId && m.createdAt > last && m.mentions?.includes(me.id)).length;
  };

  const submit = () => {
    if (!creating) return;
    api.createChannel(server.id, name, creating.type, creating.category);
    setName(""); setCreating(null);
  };

  const submitRename = () => {
    if (!renaming) return;
    api.renameChannel(renaming.id, renameVal);
    setRenaming(null);
  };

  const submitCat = () => {
    api.addCategory(server.id, catName);
    setCatName(""); setAddingCat(false);
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(server.inviteCode);
    toast.success("تم نسخ كود الدعوة");
  };

  // Group channels by category
  const grouped: Record<string, Channel[]> = { __none: [] };
  server.categories.forEach((c) => (grouped[c] = []));
  channels.forEach((c) => {
    const key = c.category && server.categories.includes(c.category) ? c.category : "__none";
    (grouped[key] = grouped[key] || []).push(c);
  });

  return (
    <aside className="w-64 bg-sidebar flex flex-col border-l border-sidebar-border z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <header className="h-14 px-4 flex items-center justify-between border-b border-sidebar-border shadow-soft hover:bg-sidebar-accent/40 cursor-pointer transition-colors">
            <h2 className="font-display font-bold text-sidebar-foreground truncate">{server.name}</h2>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </header>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-popover border-border">
          <DropdownMenuItem onClick={copyInvite}><Copy className="w-4 h-4 ml-2" /> نسخ كود الدعوة</DropdownMenuItem>
          {canManage && <DropdownMenuItem onClick={onOpenServerSettings}><Settings className="w-4 h-4 ml-2" /> إعدادات السيرفر</DropdownMenuItem>}
          {canManage && <DropdownMenuItem onClick={() => setAddingCat(true)}><FolderPlus className="w-4 h-4 ml-2" /> إنشاء فئة</DropdownMenuItem>}
          {!isOwner && (<><DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLeaveServer} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 ml-2" /> مغادرة السيرفر
            </DropdownMenuItem></>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-1">
        {/* Uncategorized first */}
        {grouped.__none.length > 0 && (
          <div className="space-y-0.5 pb-2">
            {grouped.__none.map((c) => (
              <ChannelRow key={c.id} channel={c} active={c.id === activeChannelId || (c.type === "voice" && voiceChannelId === c.id)}
                unread={unreadFor(c.id)} mentions={mentionCount(c.id)}
                onClick={() => c.type === "voice" ? onJoinVoice(c.id) : onSelectChannel(c.id)}
                canManage={canManage}
                onRename={() => { setRenameVal(c.name); setRenaming(c); }}
                onDelete={() => { if (confirm("حذف القناة؟")) api.deleteChannel(c.id); }} />
            ))}
          </div>
        )}

        {server.categories.map((cat) => {
          const list = grouped[cat] || [];
          const collapsed = collapsedCats[cat];
          return (
            <div key={cat}>
              <ContextMenu>
                <ContextMenuTrigger>
                  <div className="flex items-center justify-between px-1 mb-1 group">
                    <button onClick={() => setCollapsedCats((s) => ({ ...s, [cat]: !s[cat] }))} className="flex items-center gap-1 text-[11px] font-bold uppercase text-muted-foreground tracking-wider hover:text-sidebar-foreground transition-colors">
                      <ChevronLeft className={`w-3 h-3 transition-transform ${collapsed ? "" : "-rotate-90"}`} />
                      <span>{cat}</span>
                    </button>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-sidebar-foreground"><Plus className="w-4 h-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-popover border-border">
                          <DropdownMenuItem onClick={() => setCreating({ type: "text", category: cat })}><Hash className="w-4 h-4 ml-2" /> قناة نصية</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCreating({ type: "voice", category: cat })}><Volume2 className="w-4 h-4 ml-2" /> قناة صوتية</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </ContextMenuTrigger>
                {canManage && (
                  <ContextMenuContent className="bg-popover border-border">
                    <ContextMenuItem onClick={() => api.removeCategory(server.id, cat)} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 ml-2" /> حذف الفئة
                    </ContextMenuItem>
                  </ContextMenuContent>
                )}
              </ContextMenu>
              {!collapsed && (
                <div className="space-y-0.5 pb-2">
                  {list.map((c) => (
                    <ChannelRow key={c.id} channel={c} active={c.id === activeChannelId || (c.type === "voice" && voiceChannelId === c.id)}
                      unread={unreadFor(c.id)} mentions={mentionCount(c.id)}
                      onClick={() => c.type === "voice" ? onJoinVoice(c.id) : onSelectChannel(c.id)}
                      canManage={canManage}
                      onRename={() => { setRenameVal(c.name); setRenaming(c); }}
                      onDelete={() => { if (confirm("حذف القناة؟")) api.deleteChannel(c.id); }} />
                  ))}
                  {voiceChannelId && list.find((c) => c.id === voiceChannelId) && (
                    <div className="ml-6 mt-1 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-success/10">
                      <div className={micOn ? "rounded-full animate-pulse-ring" : ""}><Avatar user={me} size="xs" /></div>
                      <span className="text-xs font-semibold text-sidebar-foreground truncate flex-1">{me.username}</span>
                      {!micOn && <MicOff className="w-3 h-3 text-destructive" />}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {voiceChannelId && (
        <div className="px-3 py-2 bg-rail/80 border-t border-sidebar-border flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-success animate-pulse" /><span className="text-success font-bold">صوت متصل</span></div>
          <button onClick={onToggleMic} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${micOn ? "bg-secondary text-sidebar-foreground hover:bg-secondary/70" : "bg-destructive text-destructive-foreground"}`}>{micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}</button>
          <button onClick={onLeaveVoice} className="w-8 h-8 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"><PhoneOff className="w-4 h-4" /></button>
        </div>
      )}

      <button onClick={onOpenUserSettings} className="px-3 py-2.5 bg-rail flex items-center gap-2 hover:bg-rail/70 transition-colors text-right">
        <Avatar user={me} size="sm" showStatus />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-sidebar-foreground truncate">{me.username}</div>
          <div className="text-[10px] text-muted-foreground truncate">{me.customStatus || me.status}</div>
        </div>
        <Settings className="w-4 h-4 text-muted-foreground" />
      </button>

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>قناة {creating?.type === "voice" ? "صوتية" : "نصية"} جديدة</DialogTitle></DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم القناة" className="bg-secondary border-border" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(null)}>إلغاء</Button>
            <Button onClick={submit} className="bg-gradient-ice text-primary-foreground">إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>تعديل اسم القناة</DialogTitle></DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} className="bg-secondary border-border" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>إلغاء</Button>
            <Button onClick={submitRename} className="bg-gradient-ice text-primary-foreground">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addingCat} onOpenChange={setAddingCat}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>فئة جديدة</DialogTitle></DialogHeader>
          <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="اسم الفئة" className="bg-secondary border-border" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddingCat(false)}>إلغاء</Button>
            <Button onClick={submitCat} className="bg-gradient-ice text-primary-foreground">إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function ChannelRow({
  channel, active, unread, mentions, onClick, icon, canManage, onRename, onDelete,
}: {
  channel: Channel; active: boolean; unread: boolean; mentions: number;
  onClick: () => void; icon?: React.ReactNode;
  canManage: boolean; onRename: () => void; onDelete: () => void;
}) {
  const Icon = channel.type === "voice" ? Volume2 : Hash;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button onClick={onClick} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors relative ${
          active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                 : unread ? "text-sidebar-foreground font-semibold hover:bg-sidebar-accent/50"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        }`}>
          {unread && !active && <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-2 bg-foreground rounded-l-full" />}
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate flex-1 text-right">{channel.name}</span>
          {mentions > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center">{mentions}</span>}
        </button>
      </ContextMenuTrigger>
      {canManage && (
        <ContextMenuContent className="bg-popover border-border">
          <ContextMenuItem onClick={onRename}><Edit2 className="w-4 h-4 ml-2" /> تعديل الاسم</ContextMenuItem>
          <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 ml-2" /> حذف القناة
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
