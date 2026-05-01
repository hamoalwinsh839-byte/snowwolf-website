import { User, api, dmChannelId } from "@/lib/store";
import { useDB } from "@/hooks/useDB";
import Avatar from "./Avatar";
import { Users, MessageCircle, X, Settings } from "lucide-react";

type Props = {
  me: User;
  view: "friends" | "dm";
  activeDmUserId?: string;
  onSelectFriends: () => void;
  onSelectDM: (userId: string) => void;
  onCloseDM: (userId: string) => void;
  openDms: string[];
  onOpenUserSettings: () => void;
};

export default function HomeSidebar({
  me, view, activeDmUserId, onSelectFriends, onSelectDM, onCloseDM, openDms, onOpenUserSettings,
}: Props) {
  const db = useDB();
  const dmUsers = openDms.map((id) => db.users.find((u) => u.id === id)).filter(Boolean) as User[];
  const reads = db.reads[me.id] || {};

  const dmUnread = (otherId: string) => {
    const cid = dmChannelId(me.id, otherId);
    const last = reads[cid] || 0;
    return db.messages.filter((m) => m.channelId === cid && m.userId !== me.id && m.createdAt > last).length;
  };

  return (
    <aside className="w-64 bg-sidebar flex flex-col border-l border-sidebar-border z-10">
      <header className="h-14 px-4 flex items-center border-b border-sidebar-border shadow-soft">
        <h2 className="font-display font-bold text-sidebar-foreground">الرئيسية</h2>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-1">
        <button
          onClick={onSelectFriends}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            view === "friends" ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الأصدقاء</span>
          {(() => {
            const incoming = db.friendships.filter((f) => f.status === "pending" && f.toId === me.id).length;
            return incoming > 0 ? <span className="mr-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center">{incoming}</span> : null;
          })()}
        </button>

        <div className="pt-3">
          <div className="px-3 mb-1 text-[11px] font-bold uppercase text-muted-foreground tracking-wider">الرسائل المباشرة</div>
          {dmUsers.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground/60">مفيش محادثات</div>}
          {dmUsers.map((u) => {
            const unread = dmUnread(u.id);
            const active = view === "dm" && activeDmUserId === u.id;
            return (
              <div key={u.id} className={`group flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg transition-colors ${
                active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
              }`}>
                <button onClick={() => onSelectDM(u.id)} className="flex items-center gap-2 flex-1 min-w-0 text-right">
                  <Avatar user={u} size="sm" showStatus />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${active ? "font-bold text-sidebar-accent-foreground" : "text-sidebar-foreground"}`}>{u.username}</div>
                  </div>
                </button>
                {unread > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center">{unread}</span>}
                <button onClick={() => onCloseDM(u.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={onOpenUserSettings} className="px-3 py-2.5 bg-rail flex items-center gap-2 hover:bg-rail/70 transition-colors text-right">
        <Avatar user={me} size="sm" showStatus />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-sidebar-foreground truncate">{me.username}</div>
          <div className="text-[10px] text-muted-foreground truncate">{me.customStatus || me.status}</div>
        </div>
        <Settings className="w-4 h-4 text-muted-foreground" />
      </button>
    </aside>
  );
}
