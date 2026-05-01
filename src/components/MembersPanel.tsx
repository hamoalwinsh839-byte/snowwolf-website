import { Server, User, api } from "@/lib/store";
import Avatar from "./Avatar";
import { Crown, Shield, MoreVertical, UserMinus, ShieldCheck, ShieldOff } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function MembersPanel({
  server, users, meId,
}: { server: Server; users: User[]; meId: string }) {
  const myRole = server.members.find((m) => m.userId === meId)?.role;
  const canModerate = myRole === "owner" || myRole === "admin";

  const groups = {
    owner: server.members.filter((m) => m.role === "owner"),
    admin: server.members.filter((m) => m.role === "admin"),
    member: server.members.filter((m) => m.role === "member"),
  };

  const renderGroup = (label: string, items: typeof server.members, color: string, Icon?: any) => {
    if (!items.length) return null;
    return (
      <div className="mb-3">
        <div className="px-3 mb-1 flex items-center gap-1 text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
          <span>{label}</span>
          <span>— {items.length}</span>
        </div>
        <div className="space-y-0.5">
          {items.map((m) => {
            const u = users.find((x) => x.id === m.userId);
            if (!u) return null;
            return (
              <div key={m.userId} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
                <Avatar user={u} size="sm" showStatus />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-semibold truncate ${color}`}>{u.username}</span>
                    {Icon && <Icon className={`w-3 h-3 ${color}`} />}
                  </div>
                  {u.customStatus && (
                    <div className="text-[10px] text-muted-foreground truncate">{u.customStatus}</div>
                  )}
                </div>
                {canModerate && m.userId !== meId && m.role !== "owner" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      {myRole === "owner" && m.role === "member" && (
                        <DropdownMenuItem onClick={() => { api.setMemberRole(server.id, m.userId, "admin"); toast.success("تم الترقية"); }}>
                          <ShieldCheck className="w-4 h-4 ml-2" /> ترقية لأدمن
                        </DropdownMenuItem>
                      )}
                      {myRole === "owner" && m.role === "admin" && (
                        <DropdownMenuItem onClick={() => { api.setMemberRole(server.id, m.userId, "member"); toast.success("تم التنزيل"); }}>
                          <ShieldOff className="w-4 h-4 ml-2" /> تنزيل لعضو
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { api.kickMember(server.id, m.userId); toast.success("تم الطرد"); }}
                      >
                        <UserMinus className="w-4 h-4 ml-2" /> طرد من السيرفر
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-60 bg-sidebar border-r border-sidebar-border py-4 overflow-y-auto scrollbar-thin hidden lg:block">
      {renderGroup("المالك", groups.owner, "text-primary", Crown)}
      {renderGroup("المشرفين", groups.admin, "text-accent", Shield)}
      {renderGroup("الأعضاء", groups.member, "text-sidebar-foreground")}
    </aside>
  );
}
