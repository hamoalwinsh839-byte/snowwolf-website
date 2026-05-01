import { User, api, dmChannelId } from "@/lib/store";
import { useDB } from "@/hooks/useDB";
import Avatar from "./Avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, UserPlus, MessageCircle, UserMinus, Users } from "lucide-react";

type Tab = "online" | "all" | "pending" | "add";

export default function FriendsPage({
  me, onOpenDM,
}: { me: User; onOpenDM: (userId: string) => void }) {
  const db = useDB();
  const [tab, setTab] = useState<Tab>("online");
  const [addInput, setAddInput] = useState("");

  const friendships = db.friendships.filter((f) => f.fromId === me.id || f.toId === me.id);
  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.toId === me.id);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.fromId === me.id);

  const userFor = (f: typeof friendships[number]) =>
    db.users.find((u) => u.id === (f.fromId === me.id ? f.toId : f.fromId));

  const allFriends = accepted.map(userFor).filter(Boolean) as User[];
  const onlineFriends = allFriends.filter((u) => u.status !== "invisible");

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "online", label: "متصلين", count: onlineFriends.length },
    { key: "all", label: "الكل", count: allFriends.length },
    { key: "pending", label: "معلق", count: incoming.length + outgoing.length },
    { key: "add", label: "إضافة صديق" },
  ];

  const sendRequest = () => {
    try {
      api.sendFriendRequest(addInput);
      toast.success("تم إرسال طلب الصداقة");
      setAddInput("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <main className="flex-1 flex flex-col bg-background min-w-0 z-10">
      <header className="h-14 px-5 border-b border-border flex items-center gap-4 shadow-soft bg-card/40 backdrop-blur">
        <Users className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-display font-bold">الأصدقاء</h2>
        <div className="w-px h-5 bg-border" />
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                tab === t.key ? (t.key === "add" ? "bg-success text-success-foreground" : "bg-secondary text-foreground") : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {t.label}
              {!!t.count && <span className={`text-[10px] rounded-full px-1.5 ${tab === t.key ? "bg-background/30" : "bg-muted/50"}`}>{t.count}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {tab === "add" ? (
          <div className="p-6 max-w-xl">
            <h3 className="font-display text-xl font-bold mb-2">إضافة صديق</h3>
            <p className="text-sm text-muted-foreground mb-4">اكتب اسم المستخدم للشخص اللي عايز تضيفه.</p>
            <div className="flex gap-2 bg-secondary border-2 border-border focus-within:border-primary rounded-xl p-2 transition-colors">
              <Input value={addInput} onChange={(e) => setAddInput(e.target.value)} placeholder="اسم المستخدم" className="border-0 bg-transparent focus-visible:ring-0" />
              <Button onClick={sendRequest} disabled={!addInput.trim()} className="bg-gradient-ice text-primary-foreground">إرسال طلب</Button>
            </div>
          </div>
        ) : tab === "pending" ? (
          <div className="p-2">
            {incoming.length === 0 && outgoing.length === 0 && <Empty text="مفيش طلبات معلقة" />}
            {incoming.map((f) => {
              const u = userFor(f); if (!u) return null;
              return (
                <Row key={f.id} user={u} subtitle="عايز يضيفك">
                  <Button size="icon" variant="outline" onClick={() => api.acceptFriend(f.id)} className="text-success hover:bg-success hover:text-success-foreground"><Check className="w-4 h-4" /></Button>
                  <Button size="icon" variant="outline" onClick={() => api.rejectFriend(f.id)} className="text-destructive hover:bg-destructive hover:text-destructive-foreground"><X className="w-4 h-4" /></Button>
                </Row>
              );
            })}
            {outgoing.map((f) => {
              const u = userFor(f); if (!u) return null;
              return (
                <Row key={f.id} user={u} subtitle="في انتظار الرد">
                  <Button size="icon" variant="outline" onClick={() => api.rejectFriend(f.id)}><X className="w-4 h-4" /></Button>
                </Row>
              );
            })}
          </div>
        ) : (
          <div className="p-2">
            {(tab === "online" ? onlineFriends : allFriends).length === 0 && <Empty text="مفيش أصدقاء لسه. ابعت طلب صداقة!" />}
            {(tab === "online" ? onlineFriends : allFriends).map((u) => (
              <Row key={u.id} user={u} subtitle={u.customStatus || u.status}>
                <Button size="icon" variant="outline" onClick={() => onOpenDM(u.id)}><MessageCircle className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => { api.removeFriend(u.id); toast.success("تم الحذف"); }} className="hover:bg-destructive hover:text-destructive-foreground"><UserMinus className="w-4 h-4" /></Button>
              </Row>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ user, subtitle, children }: { user: User; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card/60 group transition-colors">
      <Avatar user={user} size="md" showStatus />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{user.username}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
      </div>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <UserPlus className="w-16 h-16 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
