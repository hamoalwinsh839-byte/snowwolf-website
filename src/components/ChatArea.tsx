import { Channel, Message, User, api } from "@/lib/store";
import { Hash, Volume2, Mic, MicOff, PhoneOff, Headphones, Users, Pin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type Props = {
  channel: Channel;
  messages: Message[];
  users: User[];
  me: User;
  voiceMembers: User[];
  micOn: boolean;
  onToggleMic: () => void;
  onLeaveVoice: () => void;
  onJoinVoice: () => void;
  inVoice: boolean;
  onToggleMembers: () => void;
  membersOpen: boolean;
  canModerate: boolean;
  pinnedIds: string[];
  friendIds: string[];
  onOpenDM: (userId: string) => void;
  onAddFriend: (userId: string) => void;
  typingUserIds: string[];
  onTyping: () => void;
};

export default function ChatArea({
  channel, messages, users, me, voiceMembers,
  micOn, onToggleMic, onLeaveVoice, onJoinVoice, inVoice,
  onToggleMembers, membersOpen, canModerate, pinnedIds, friendIds,
  onOpenDM, onAddFriend, typingUserIds, onTyping,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, channel.id]);

  useEffect(() => { api.markRead(channel.id); }, [channel.id, messages.length]);

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, search]);

  const pinnedMessages = pinnedIds.map((id) => messages.find((m) => m.id === id)).filter(Boolean) as Message[];

  return (
    <main className="flex-1 flex flex-col bg-background min-w-0 z-10">
      <header className="h-14 px-5 border-b border-border flex items-center gap-3 shadow-soft bg-card/40 backdrop-blur">
        {channel.type === "text" ? <Hash className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-muted-foreground" />}
        <h2 className="font-display font-bold text-foreground">{channel.name}</h2>
        {channel.topic && (<><span className="w-px h-5 bg-border" /><span className="text-sm text-muted-foreground truncate hidden md:block">{channel.topic}</span></>)}
        <div className="flex-1" />

        {channel.type === "text" && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary relative">
                  <Pin className="w-5 h-5" />
                  {pinnedMessages.length > 0 && <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-primary" />}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-popover border-border max-h-96 overflow-y-auto p-0">
                <div className="px-4 py-3 border-b border-border font-display font-bold flex items-center gap-2"><Pin className="w-4 h-4 text-primary" /> الرسائل المثبتة</div>
                <div className="p-2 space-y-1">
                  {pinnedMessages.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-6">مفيش رسائل مثبتة</div>
                  ) : pinnedMessages.map((m) => {
                    const u = users.find((x) => x.id === m.userId);
                    return (
                      <button key={m.id} onClick={() => { setHighlight(m.id); setTimeout(() => setHighlight(null), 2500); }} className="w-full text-right p-2 rounded-lg hover:bg-secondary">
                        <div className="flex items-center gap-2 mb-1"><Avatar user={u!} size="xs" /><span className="text-xs font-bold">{u?.username}</span></div>
                        <p className="text-sm text-foreground/80 truncate">{m.content || "[مرفق]"}</p>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <button onClick={() => setSearchOpen((o) => !o)} className={`p-2 rounded-lg hover:bg-secondary transition-colors ${searchOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Search className="w-5 h-5" />
            </button>
          </>
        )}

        <button onClick={onToggleMembers} className={`p-2 rounded-lg hover:bg-secondary transition-colors hidden lg:block ${membersOpen ? "text-primary" : "text-muted-foreground"}`}>
          <Users className="w-5 h-5" />
        </button>
      </header>

      {searchOpen && (
        <div className="px-5 py-2 border-b border-border bg-card/30 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في الرسائل..." className="bg-transparent border-0 focus-visible:ring-0 h-8 px-0" autoFocus />
          {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>
      )}

      {channel.type === "text" ? (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-1 py-4">
            {messages.length === 0 && (
              <div className="h-full min-h-[40vh] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-ice flex items-center justify-center mb-4 shadow-ice"><Hash className="w-10 h-10 text-primary-foreground" /></div>
                <h3 className="font-display text-2xl font-bold mb-2">أهلاً بيك في #{channel.name}</h3>
                <p className="text-muted-foreground">دي بداية القناة. اكتب أول رسالة!</p>
              </div>
            )}
            <MessageList
              messages={filteredMessages}
              users={users}
              me={me}
              onReply={(m, author) => setReplyTo({ id: m.id, username: author.username })}
              onMessage={onOpenDM}
              onAddFriend={onAddFriend}
              friendIds={friendIds}
              canModerate={canModerate}
              canPin={canModerate}
              pinnedIds={pinnedIds}
              highlightId={highlight}
              search={search}
            />
          </div>

          {typingUserIds.length > 0 && (
            <div className="px-6 text-xs text-muted-foreground -mb-1 h-4 flex items-center gap-2">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
              <span className="font-bold">{typingUserIds.map((id) => users.find((u) => u.id === id)?.username).filter(Boolean).join("، ")}</span>
              <span>بيكتب…</span>
            </div>
          )}

          <MessageInput
            channelId={channel.id}
            placeholder={`اكتب رسالة في #${channel.name}`}
            users={users}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onTyping={onTyping}
          />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!inVoice ? (
            <div className="text-center animate-float-in">
              <div className="w-24 h-24 rounded-3xl bg-gradient-ice flex items-center justify-center mb-5 shadow-ice mx-auto"><Volume2 className="w-12 h-12 text-primary-foreground" /></div>
              <h3 className="font-display text-3xl font-bold mb-2">{channel.name}</h3>
              <p className="text-muted-foreground mb-6">اضغط دخول عشان تتصل بالصوت</p>
              <button onClick={onJoinVoice} className="px-8 h-12 rounded-2xl bg-gradient-ice text-primary-foreground font-bold shadow-ice hover:opacity-90 transition-opacity">دخول الصوت</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8 w-full max-w-3xl">
                {voiceMembers.map((u) => (
                  <div key={u.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center gap-3 animate-float-in">
                    <div className={u.id === me.id && micOn ? "rounded-full ring-4 ring-success/50 animate-pulse-ring" : ""}>
                      <Avatar user={u} size="xl" />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-sm">{u.username}</div>
                      {u.id === me.id && (
                        <div className={`text-[10px] font-semibold flex items-center gap-1 justify-center mt-1 ${micOn ? "text-success" : "text-destructive"}`}>
                          {micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}{micOn ? "مفتوح" : "مغلق"}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {micOn && (
                <div className="flex items-end gap-1 h-10 mb-6">
                  {[...Array(7)].map((_, i) => (
                    <span key={i} className="w-1.5 bg-gradient-ice rounded-full animate-voice-bar" style={{ height: "100%", animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button onClick={onToggleMic} className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-soft transition-all ${micOn ? "bg-card border border-border hover:bg-secondary" : "bg-destructive text-destructive-foreground"}`}>
                  {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </button>
                <button className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center shadow-soft hover:bg-secondary transition-colors"><Headphones className="w-6 h-6" /></button>
                <button onClick={onLeaveVoice} className="w-14 h-14 rounded-2xl bg-destructive text-destructive-foreground flex items-center justify-center shadow-soft hover:opacity-90 transition-opacity"><PhoneOff className="w-6 h-6" /></button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
