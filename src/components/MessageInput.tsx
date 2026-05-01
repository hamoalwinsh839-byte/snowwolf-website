import { Attachment, User, api } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { Smile, Send, Paperclip, X, AtSign } from "lucide-react";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Avatar from "./Avatar";

const QUICK_EMOJIS = ["👍","❤️","😂","🔥","🐺","❄️","🎉","😮","😢","👀","🙏","💯","✨","🤔","😎"];

export default function MessageInput({
  channelId, placeholder, users, replyTo, onCancelReply, onSent, onTyping,
}: {
  channelId: string;
  placeholder: string;
  users: User[];
  replyTo?: { id: string; username: string } | null;
  onCancelReply?: () => void;
  onSent?: () => void;
  onTyping?: () => void;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId, replyTo?.id]);

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() && attachments.length === 0) return;
    api.sendMessage(channelId, text, { attachments: attachments.length ? attachments : undefined, replyToId: replyTo?.id });
    setText("");
    setAttachments([]);
    onCancelReply?.();
    onSent?.();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, 4).forEach((f) => {
      if (f.size > 3 * 1024 * 1024) { alert(`${f.name} أكبر من 3MB`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((a) => [...a, { id: crypto.randomUUID(), name: f.name, type: f.type, dataUrl: reader.result as string }]);
      };
      reader.readAsDataURL(f);
    });
  };

  const onChange = (v: string) => {
    setText(v);
    onTyping?.();
    const m = v.match(/@(\S*)$/);
    if (m) { setMentionQuery(m[1].toLowerCase()); setMentionOpen(true); }
    else setMentionOpen(false);
  };

  const insertMention = (username: string) => {
    setText((t) => t.replace(/@(\S*)$/, `@${username} `));
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const matches = mentionOpen ? users.filter((u) => u.username.toLowerCase().includes(mentionQuery)).slice(0, 5) : [];

  return (
    <div className="px-5 pb-5">
      {replyTo && (
        <div className="flex items-center gap-2 bg-card/60 border border-border rounded-t-xl px-4 py-2 -mb-1 text-sm">
          <span className="text-muted-foreground">رد على</span>
          <span className="font-bold text-primary">{replyTo.username}</span>
          <button onClick={onCancelReply} className="mr-auto text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap p-3 bg-card border border-border rounded-t-xl -mb-1">
          {attachments.map((a) => (
            <div key={a.id} className="relative group">
              {a.type.startsWith("image/") ? (
                <img src={a.dataUrl} alt={a.name} className="w-20 h-20 object-cover rounded-lg border border-border" />
              ) : (
                <div className="w-20 h-20 rounded-lg border border-border bg-secondary flex items-center justify-center text-[10px] p-1 text-center break-all">{a.name}</div>
              )}
              <button onClick={() => setAttachments((arr) => arr.filter((x) => x.id !== a.id))} className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">×</button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={send} className="relative">
        {mentionOpen && matches.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-deep overflow-hidden z-20">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground bg-card/50">منشن المستخدمين</div>
            {matches.map((u) => (
              <button key={u.id} type="button" onClick={() => insertMention(u.username)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary text-right">
                <Avatar user={u} size="sm" />
                <span className="font-semibold text-sm">{u.username}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-1 focus-within:border-primary transition-colors">
          <button type="button" onClick={() => fileRef.current?.click()} className="text-muted-foreground hover:text-primary p-1.5">
            <Paperclip className="w-5 h-5" />
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />

          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="border-0 bg-transparent focus-visible:ring-0 h-12 px-0"
            maxLength={2000}
          />

          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-primary p-1.5"><AtSign className="w-5 h-5" /></button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1 bg-popover border-border max-h-64 overflow-y-auto" align="end">
              {users.map((u) => (
                <button key={u.id} type="button" onClick={() => setText((t) => t + `@${u.username} `)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded text-right">
                  <Avatar user={u} size="xs" />
                  <span className="text-sm">{u.username}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-primary p-1.5"><Smile className="w-5 h-5" /></button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 bg-popover border-border" align="end">
              <div className="grid grid-cols-8 gap-0.5 max-w-[280px]">
                {QUICK_EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => setText((t) => t + e)} className="w-8 h-8 rounded hover:bg-secondary text-xl">{e}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button type="submit" disabled={!text.trim() && attachments.length === 0} className="w-9 h-9 rounded-xl bg-gradient-ice text-primary-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-ice transition-opacity">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
