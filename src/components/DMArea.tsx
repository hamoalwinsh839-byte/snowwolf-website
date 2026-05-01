import { User, Message, api, dmChannelId } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { AtSign } from "lucide-react";

export default function DMArea({
  me, other, messages, users,
}: {
  me: User;
  other: User;
  messages: Message[];
  users: User[];
}) {
  const cid = dmChannelId(me.id, other.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, cid]);

  useEffect(() => { api.markRead(cid); }, [cid, messages.length]);

  return (
    <main className="flex-1 flex flex-col bg-background min-w-0 z-10">
      <header className="h-14 px-5 border-b border-border flex items-center gap-3 shadow-soft bg-card/40 backdrop-blur">
        <AtSign className="w-5 h-5 text-muted-foreground" />
        <Avatar user={other} size="sm" showStatus />
        <h2 className="font-display font-bold">{other.username}</h2>
        {other.customStatus && <><span className="w-px h-5 bg-border" /><span className="text-sm text-muted-foreground truncate">{other.customStatus}</span></>}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-1 py-4">
        {messages.length === 0 && (
          <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center px-6">
            <Avatar user={other} size="xl" />
            <h3 className="font-display text-2xl font-bold mt-4">{other.username}</h3>
            <p className="text-muted-foreground mt-1">دي بداية محادثتك مع <span className="font-bold">{other.username}</span></p>
          </div>
        )}
        <MessageList
          messages={messages}
          users={users}
          me={me}
          onReply={(m, author) => setReplyTo({ id: m.id, username: author.username })}
          canModerate={false}
        />
      </div>

      <MessageInput
        channelId={cid}
        placeholder={`رسالة لـ @${other.username}`}
        users={[other, me]}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </main>
  );
}
