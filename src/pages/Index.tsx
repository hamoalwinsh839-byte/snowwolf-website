import { useEffect, useMemo, useRef, useState } from "react";
import { api, dmChannelId } from "@/lib/store";
import { useDB } from "@/hooks/useDB";
import AuthScreen from "@/components/AuthScreen";
import ServerRail from "@/components/ServerRail";
import ChannelSidebar from "@/components/ChannelSidebar";
import ChatArea from "@/components/ChatArea";
import MembersPanel from "@/components/MembersPanel";
import UserSettings from "@/components/UserSettings";
import ServerSettings from "@/components/ServerSettings";
import Snowfall from "@/components/Snowfall";
import HomeSidebar from "@/components/HomeSidebar";
import FriendsPage from "@/components/FriendsPage";
import DMArea from "@/components/DMArea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";

const HOME_ID = "__home";

export default function Index() {
  const db = useDB();
  const me = useMemo(() => api.currentUser(), [db]);

  const [activeServerId, setActiveServerId] = useState<string>(HOME_ID);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [voiceChannelId, setVoiceChannelId] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [membersOpen, setMembersOpen] = useState(true);

  // Home view state
  const [homeView, setHomeView] = useState<"friends" | "dm">("friends");
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [openDms, setOpenDms] = useState<string[]>([]);

  // Typing indicators (local channel -> userIds with timestamps)
  const [typingMap, setTypingMap] = useState<Record<string, Record<string, number>>>({});

  const [creatingServer, setCreatingServer] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState<string | undefined>();

  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);

  const micStreamRef = useRef<MediaStream | null>(null);
  const lastMentionCountRef = useRef(0);

  // Auto-default channel selection per server
  useEffect(() => {
    if (!me || activeServerId === HOME_ID) return;
    const channels = db.channels.filter((c) => c.serverId === activeServerId);
    const stillExists = channels.some((c) => c.id === activeChannelId);
    if (!stillExists) {
      const firstText = channels.find((c) => c.type === "text") || channels[0];
      setActiveChannelId(firstText?.id || "");
    }
  }, [activeServerId, db.channels, activeChannelId, me]);

  // Mention notification toast
  useEffect(() => {
    if (!me) return;
    const myMentions = db.messages.filter((m) => m.mentions?.includes(me.id) && m.userId !== me.id);
    if (myMentions.length > lastMentionCountRef.current && lastMentionCountRef.current > 0) {
      const latest = myMentions[myMentions.length - 1];
      const author = db.users.find((u) => u.id === latest.userId);
      toast(`${author?.username} منشنك`, { description: latest.content.slice(0, 80) });
    }
    lastMentionCountRef.current = myMentions.length;
  }, [db.messages, db.users, me]);

  // Cleanup stale typing
  useEffect(() => {
    const t = setInterval(() => {
      setTypingMap((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        for (const cid of Object.keys(prev)) {
          const users: Record<string, number> = {};
          for (const uid of Object.keys(prev[cid])) {
            if (now - prev[cid][uid] < 4000) users[uid] = prev[cid][uid];
          }
          if (Object.keys(users).length) next[cid] = users;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const stopMic = () => { micStreamRef.current?.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; };
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream; setMicOn(true);
    } catch { toast.error("مش قادر يفتح الميكروفون"); setMicOn(false); }
  };

  const joinVoice = async (channelId: string) => {
    api.joinVoice(channelId); setVoiceChannelId(channelId); setActiveChannelId(channelId);
    await startMic(); toast.success("اتصلت بالقناة الصوتية");
  };
  const leaveVoice = () => { if (voiceChannelId) api.leaveVoice(voiceChannelId); stopMic(); setVoiceChannelId(null); };
  const toggleMic = async () => { if (micOn) { stopMic(); setMicOn(false); } else await startMic(); };

  useEffect(() => () => stopMic(), []);

  const handleLogout = () => { leaveVoice(); api.logout(); };
  const handleLeaveServer = () => {
    if (!activeServer) return;
    if (!confirm(`مغادرة ${activeServer.name}؟`)) return;
    api.leaveServer(activeServer.id);
    setActiveServerId(HOME_ID);
  };

  const openDM = (userId: string) => {
    setActiveServerId(HOME_ID);
    setHomeView("dm");
    setActiveDmUserId(userId);
    setOpenDms((arr) => arr.includes(userId) ? arr : [...arr, userId]);
  };
  const closeDM = (userId: string) => {
    setOpenDms((arr) => arr.filter((id) => id !== userId));
    if (activeDmUserId === userId) { setActiveDmUserId(null); setHomeView("friends"); }
  };
  const addFriend = (userId: string) => {
    try { api.sendFriendRequest(userId); toast.success("تم إرسال طلب الصداقة"); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleTyping = (channelId: string) => {
    if (!me) return;
    setTypingMap((prev) => ({ ...prev, [channelId]: { ...(prev[channelId] || {}), [me.id]: Date.now() } }));
  };

  if (!me) return <AuthScreen onAuth={() => {}} />;

  const isHome = activeServerId === HOME_ID;
  const activeServer = isHome ? null : db.servers.find((s) => s.id === activeServerId);
  const channels = activeServer ? db.channels.filter((c) => c.serverId === activeServer.id) : [];
  const activeChannel = db.channels.find((c) => c.id === activeChannelId);
  const messages = activeChannel ? db.messages.filter((m) => m.channelId === activeChannelId) : [];
  const voiceMemberIds = activeChannel?.type === "voice" ? db.voice[activeChannel.id] || [] : [];
  const voiceMembers = voiceMemberIds.map((id) => db.users.find((u) => u.id === id)!).filter(Boolean);
  const myRoleInServer = activeServer?.members.find((m) => m.userId === me.id)?.role;
  const canModerate = myRoleInServer === "owner" || myRoleInServer === "admin";

  const friendIds = db.friendships
    .filter((f) => f.status === "accepted" && (f.fromId === me.id || f.toId === me.id))
    .map((f) => (f.fromId === me.id ? f.toId : f.fromId));

  const dmOther = activeDmUserId ? db.users.find((u) => u.id === activeDmUserId) : null;
  const dmMessages = dmOther ? db.messages.filter((m) => m.channelId === dmChannelId(me.id, dmOther.id)) : [];

  const typingHere = activeChannel ? Object.keys(typingMap[activeChannel.id] || {}).filter((id) => id !== me.id) : [];

  return (
    <div className="h-screen flex bg-background overflow-hidden relative" dir="rtl">
      <Snowfall count={25} />

      <ServerRail
        servers={db.servers}
        activeId={isHome ? "" : activeServerId}
        onSelect={(id) => setActiveServerId(id || HOME_ID)}
        onCreate={() => setCreatingServer(true)}
        onLogout={handleLogout}
        onOpenSettings={() => setUserSettingsOpen(true)}
        me={me}
      />

      {isHome ? (
        <>
          <HomeSidebar
            me={me}
            view={homeView}
            activeDmUserId={activeDmUserId || undefined}
            onSelectFriends={() => { setHomeView("friends"); setActiveDmUserId(null); }}
            onSelectDM={(uid) => { setHomeView("dm"); setActiveDmUserId(uid); setOpenDms((arr) => arr.includes(uid) ? arr : [...arr, uid]); }}
            onCloseDM={closeDM}
            openDms={openDms}
            onOpenUserSettings={() => setUserSettingsOpen(true)}
          />
          {homeView === "friends" || !dmOther ? (
            <FriendsPage me={me} onOpenDM={openDM} />
          ) : (
            <DMArea me={me} other={dmOther} messages={dmMessages} users={db.users} />
          )}
        </>
      ) : activeServer ? (
        <>
          <ChannelSidebar
            server={activeServer}
            channels={channels}
            activeChannelId={activeChannelId}
            onSelectChannel={(id) => {
              const ch = channels.find((c) => c.id === id);
              if (ch?.type === "voice") joinVoice(id); else setActiveChannelId(id);
            }}
            voiceChannelId={voiceChannelId}
            micOn={micOn}
            onToggleMic={toggleMic}
            onLeaveVoice={leaveVoice}
            onJoinVoice={joinVoice}
            me={me}
            onOpenServerSettings={() => setServerSettingsOpen(true)}
            onOpenUserSettings={() => setUserSettingsOpen(true)}
            onLeaveServer={handleLeaveServer}
          />

          {activeChannel ? (
            <ChatArea
              channel={activeChannel}
              messages={messages}
              users={db.users}
              me={me}
              voiceMembers={voiceMembers}
              micOn={micOn}
              onToggleMic={toggleMic}
              onLeaveVoice={leaveVoice}
              onJoinVoice={() => joinVoice(activeChannel.id)}
              inVoice={voiceChannelId === activeChannel.id}
              onToggleMembers={() => setMembersOpen((o) => !o)}
              membersOpen={membersOpen}
              canModerate={canModerate}
              pinnedIds={activeServer.pinnedMessageIds}
              friendIds={friendIds}
              onOpenDM={openDM}
              onAddFriend={addFriend}
              typingUserIds={typingHere}
              onTyping={() => handleTyping(activeChannel.id)}
            />
          ) : (
            <main className="flex-1 flex items-center justify-center text-muted-foreground">اختر قناة</main>
          )}

          {membersOpen && <MembersPanel server={activeServer} users={db.users} meId={me.id} />}
          <ServerSettings
            server={activeServer}
            isOwner={activeServer.ownerId === me.id}
            open={serverSettingsOpen}
            onClose={() => setServerSettingsOpen(false)}
            onDeleted={() => { setServerSettingsOpen(false); setActiveServerId(HOME_ID); }}
          />
        </>
      ) : null}

      <UserSettings user={me} open={userSettingsOpen} onClose={() => setUserSettingsOpen(false)} />

      <Dialog open={creatingServer} onOpenChange={(o) => { setCreatingServer(o); if (!o) { setServerName(""); setServerIcon(undefined); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-display text-2xl">سيرفر جديد</DialogTitle></DialogHeader>
          <div className="flex justify-center my-2"><ImageUpload current={serverIcon} onChange={setServerIcon} size={96} rounded="2xl" /></div>
          <Input value={serverName} onChange={(e) => setServerName(e.target.value)} placeholder="اسم السيرفر" className="bg-secondary border-border h-12" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreatingServer(false)}>إلغاء</Button>
            <Button onClick={() => {
              const s = api.createServer(serverName, serverIcon);
              setServerName(""); setServerIcon(undefined); setCreatingServer(false);
              setActiveServerId(s.id);
            }} className="bg-gradient-ice text-primary-foreground">إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
