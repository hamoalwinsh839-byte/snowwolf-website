import { Message, User, api } from "@/lib/store";
import Avatar from "./Avatar";
import { Edit2, Trash2, MoreHorizontal, Smile, Reply, Pin, CornerUpRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import ProfilePopover from "./ProfilePopover";

const QUICK = ["👍","❤️","😂","🔥","🐺","❄️","🎉","😮"];

export default function MessageList({
  messages, users, me, onReply, onMessage, onAddFriend, friendIds, canModerate, canPin, pinnedIds = [],
  highlightId, search,
}: {
  messages: Message[];
  users: User[];
  me: User;
  onReply: (m: Message, author: User) => void;
  onMessage?: (userId: string) => void;
  onAddFriend?: (userId: string) => void;
  friendIds?: string[];
  canModerate: boolean;
  canPin?: boolean;
  pinnedIds?: string[];
  highlightId?: string | null;
  search?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightId && refs.current[highlightId]) {
      refs.current[highlightId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);

  const renderContent = (text: string) => {
    if (!text) return null;
    const tokens = text.split(/(@\S+)/g);
    return tokens.map((t, i) => {
      if (t.startsWith("@")) {
        const name = t.slice(1);
        const u = users.find((u) => u.username.toLowerCase() === name.toLowerCase());
        if (u) return <span key={i} className="bg-primary/20 text-primary font-semibold px-1 rounded">@{u.username}</span>;
      }
      if (search && t.toLowerCase().includes(search.toLowerCase())) {
        const re = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
        const parts = t.split(re);
        return parts.map((p, j) => p.toLowerCase() === search.toLowerCase()
          ? <mark key={`${i}-${j}`} className="bg-primary/40 text-foreground rounded">{p}</mark>
          : <span key={`${i}-${j}`}>{p}</span>);
      }
      return <span key={i}>{t}</span>;
    });
  };

  return (
    <>
      {messages.map((m, i) => {
        const author = userMap[m.userId];
        if (!author) return null;
        const prev = messages[i - 1];
        const grouped = prev && prev.userId === m.userId && !m.replyToId && m.createdAt - prev.createdAt < 5 * 60 * 1000;
        const isMine = m.userId === me.id;
        const isMentioned = m.mentions?.includes(me.id);
        const replyTo = m.replyToId ? messages.find((x) => x.id === m.replyToId) || null : null;
        const replyAuthor = replyTo ? userMap[replyTo.userId] : null;
        const pinned = pinnedIds.includes(m.id);
        const highlighted = highlightId === m.id;

        return (
          <div
            key={m.id}
            ref={(el) => (refs.current[m.id] = el)}
            className={`relative group px-4 py-1 rounded-lg transition-colors ${
              isMentioned ? "bg-primary/5 border-r-2 border-primary" : "hover:bg-card/40"
            } ${grouped ? "" : "mt-3"} ${highlighted ? "ring-2 ring-primary animate-float-in" : ""}`}
          >
            {replyTo && replyAuthor && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-12 mb-0.5">
                <CornerUpRight className="w-3 h-3 rotate-180" />
                <Avatar user={replyAuthor} size="xs" />
                <span className="font-semibold text-foreground">{replyAuthor.username}</span>
                <span className="truncate max-w-md">{replyTo.content || "[مرفق]"}</span>
              </div>
            )}

            <div className="flex gap-3">
              {grouped ? <div className="w-10 shrink-0" /> : (
                <ProfilePopover
                  user={author}
                  isMe={author.id === me.id}
                  isFriend={friendIds?.includes(author.id)}
                  onMessage={onMessage ? () => onMessage(author.id) : undefined}
                  onAddFriend={onAddFriend ? () => onAddFriend(author.id) : undefined}
                >
                  <button className="shrink-0"><Avatar user={author} size="md" /></button>
                </ProfilePopover>
              )}
              <div className="min-w-0 flex-1">
                {!grouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <ProfilePopover user={author} isMe={author.id === me.id} isFriend={friendIds?.includes(author.id)} onMessage={onMessage ? () => onMessage(author.id) : undefined} onAddFriend={onAddFriend ? () => onAddFriend(author.id) : undefined}>
                      <button className="font-bold text-foreground hover:underline">{author.username}</button>
                    </ProfilePopover>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                    </span>
                    {pinned && <Pin className="w-3 h-3 text-primary" />}
                  </div>
                )}

                {editingId === m.id ? (
                  <Input
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { api.editMessage(m.id, editVal); setEditingId(null); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="bg-secondary border-border h-8"
                    autoFocus
                  />
                ) : (
                  <p className="text-foreground/90 break-words leading-relaxed whitespace-pre-wrap">
                    {renderContent(m.content)}
                    {m.editedAt && <span className="text-[10px] text-muted-foreground mr-1">(معدلة)</span>}
                  </p>
                )}

                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.attachments.map((a) => (
                      a.type.startsWith("image/") ? (
                        <a key={a.id} href={a.dataUrl} target="_blank" rel="noreferrer">
                          <img src={a.dataUrl} alt={a.name} className="max-w-xs max-h-72 rounded-xl border border-border hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <a key={a.id} href={a.dataUrl} download={a.name} className="px-3 py-2 bg-secondary border border-border rounded-xl text-sm hover:border-primary">📎 {a.name}</a>
                      )
                    ))}
                  </div>
                )}

                {!!m.reactions?.length && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.reactions.map((r) => {
                      const mine = r.userIds.includes(me.id);
                      return (
                        <button
                          key={r.emoji}
                          onClick={() => api.toggleReaction(m.id, r.emoji)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                            mine ? "bg-primary/15 border-primary text-primary" : "bg-secondary border-border hover:border-muted-foreground"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span className="font-bold">{r.userIds.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="absolute top-0 left-3 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-soft p-0.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"><Smile className="w-4 h-4" /></button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-popover border-border">
                  <div className="flex gap-1 flex-wrap max-w-[220px]">
                    {QUICK.map((e) => (
                      <button key={e} onClick={() => api.toggleReaction(m.id, e)} className="w-8 h-8 rounded hover:bg-secondary text-xl">{e}</button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <button onClick={() => onReply(m, author)} className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"><Reply className="w-4 h-4" /></button>
              {(isMine || canModerate || canPin) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border">
                    {isMine && (
                      <DropdownMenuItem onClick={() => { setEditVal(m.content); setEditingId(m.id); }}>
                        <Edit2 className="w-4 h-4 ml-2" /> تعديل
                      </DropdownMenuItem>
                    )}
                    {canPin && (
                      <DropdownMenuItem onClick={() => api.pinMessage(m.id)}>
                        <Pin className="w-4 h-4 ml-2" /> {pinned ? "إلغاء التثبيت" : "تثبيت"}
                      </DropdownMenuItem>
                    )}
                    {(isMine || canModerate) && (
                      <DropdownMenuItem onClick={() => api.deleteMessage(m.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 ml-2" /> حذف
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
