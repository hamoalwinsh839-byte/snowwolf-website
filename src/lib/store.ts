// SnowWolf — Supabase-backed data layer (replaces localStorage v3)
import { supabase } from "@/integrations/supabase/client";

export type Role = "owner" | "admin" | "member";
export type UserStatus = "online" | "idle" | "dnd" | "invisible";

export type User = {
  id: string;
  username: string;
  password: string; // unused (Supabase Auth manages it)
  avatarColor: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  status: UserStatus;
  customStatus?: string;
  createdAt: number;
};

export type Channel = {
  id: string;
  serverId: string;
  name: string;
  type: "text" | "voice";
  topic?: string;
  category?: string;
};

export type ServerMember = {
  userId: string;
  role: Role;
  joinedAt: number;
  nickname?: string;
};

export type Server = {
  id: string;
  name: string;
  iconColor: string;
  iconUrl?: string;
  ownerId: string;
  members: ServerMember[];
  inviteCode: string;
  categories: string[];
  pinnedMessageIds: string[];
  createdAt: number;
};

export type Reaction = { emoji: string; userIds: string[] };

export type Attachment = {
  id: string;
  name: string;
  type: string; // mime
  dataUrl: string;
};

export type Message = {
  id: string;
  channelId: string; // text-channel id or "dm:<sortedUUID>_<sortedUUID>"
  userId: string;
  content: string;
  createdAt: number;
  editedAt?: number;
  reactions?: Reaction[];
  attachments?: Attachment[];
  replyToId?: string;
  mentions?: string[];
};

export type FriendStatus = "pending" | "accepted" | "blocked";
export type Friendship = {
  id: string;
  fromId: string;
  toId: string;
  status: FriendStatus;
  createdAt: number;
};

export type DBSnapshot = {
  users: User[];
  servers: Server[];
  channels: Channel[];
  messages: Message[];
  friendships: Friendship[];
  reads: Record<string, Record<string, number>>;
  session: { userId: string | null };
  voice: Record<string, string[]>;
};

const COLORS = [
  "from-sky-400 to-blue-600",
  "from-cyan-400 to-blue-500",
  "from-indigo-400 to-blue-700",
  "from-blue-300 to-cyan-500",
  "from-slate-400 to-blue-600",
  "from-teal-400 to-sky-600",
];

export function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function dmChannelId(a: string, b: string) {
  return "dm:" + [a, b].sort().join("_");
}

// ========== In-memory cache ==========
// useDB hydrates this and re-hydrates on realtime events.
// Components read it synchronously via the `db` snapshot.
let _cache: DBSnapshot = emptyCache();

function emptyCache(): DBSnapshot {
  return {
    users: [],
    servers: [],
    channels: [],
    messages: [],
    friendships: [],
    reads: {},
    session: { userId: null },
    voice: {},
  };
}

export function getCache(): DBSnapshot {
  return _cache;
}

export function setCache(next: DBSnapshot) {
  _cache = next;
  window.dispatchEvent(new CustomEvent("snowwolf:db"));
}

export function patchCache(patch: Partial<DBSnapshot>) {
  _cache = { ..._cache, ...patch };
  window.dispatchEvent(new CustomEvent("snowwolf:db"));
}

// ========== Mappers (snake_case <-> camelCase) ==========
function mapProfile(p: any): User {
  return {
    id: p.id,
    username: p.username,
    password: "",
    avatarColor: p.avatar_color,
    avatarUrl: p.avatar_url || undefined,
    bannerUrl: p.banner_url || undefined,
    bio: p.bio || undefined,
    status: p.status,
    customStatus: p.custom_status || undefined,
    createdAt: new Date(p.created_at).getTime(),
  };
}

function mapServer(s: any, members: any[]): Server {
  return {
    id: s.id,
    name: s.name,
    iconColor: s.icon_color,
    iconUrl: s.icon_url || undefined,
    ownerId: s.owner_id,
    inviteCode: s.invite_code,
    categories: s.categories || [],
    pinnedMessageIds: s.pinned_message_ids || [],
    createdAt: new Date(s.created_at).getTime(),
    members: members
      .filter((m) => m.server_id === s.id)
      .map((m) => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: new Date(m.joined_at).getTime(),
        nickname: m.nickname || undefined,
      })),
  };
}

function mapChannel(c: any): Channel {
  return {
    id: c.id,
    serverId: c.server_id,
    name: c.name,
    type: c.type,
    topic: c.topic || undefined,
    category: c.category || undefined,
  };
}

function mapMessage(m: any, reactions: any[]): Message {
  // Group reactions for this message
  const rxs: Reaction[] = [];
  reactions
    .filter((r) => r.message_id === m.id)
    .forEach((r) => {
      let g = rxs.find((x) => x.emoji === r.emoji);
      if (!g) {
        g = { emoji: r.emoji, userIds: [] };
        rxs.push(g);
      }
      g.userIds.push(r.user_id);
    });

  return {
    id: m.id,
    channelId: m.channel_key,
    userId: m.user_id,
    content: m.content,
    createdAt: new Date(m.created_at).getTime(),
    editedAt: m.edited_at ? new Date(m.edited_at).getTime() : undefined,
    reactions: rxs,
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    replyToId: m.reply_to_id || undefined,
    mentions: m.mentions || [],
  };
}

function mapFriendship(f: any): Friendship {
  return {
    id: f.id,
    fromId: f.from_id,
    toId: f.to_id,
    status: f.status,
    createdAt: new Date(f.created_at).getTime(),
  };
}

// ========== Full hydrate ==========
export async function hydrateAll(currentUserId: string | null): Promise<DBSnapshot> {
  if (!currentUserId) {
    const snap = emptyCache();
    setCache(snap);
    return snap;
  }

  // Run independent queries in parallel
  const [
    profilesRes,
    serversRes,
    membersRes,
    channelsRes,
    messagesRes,
    reactionsRes,
    friendshipsRes,
    readsRes,
    voiceRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("servers").select("*"),
    supabase.from("server_members").select("*"),
    supabase.from("channels").select("*").order("position"),
    supabase.from("messages").select("*").order("created_at"),
    supabase.from("reactions").select("*"),
    supabase.from("friendships").select("*"),
    supabase.from("read_states").select("*").eq("user_id", currentUserId),
    supabase.from("voice_presence").select("*"),
  ]);

  const profiles = profilesRes.data || [];
  const serversRaw = serversRes.data || [];
  const membersRaw = membersRes.data || [];
  const channelsRaw = channelsRes.data || [];
  const messagesRaw = messagesRes.data || [];
  const reactionsRaw = reactionsRes.data || [];
  const friendshipsRaw = friendshipsRes.data || [];
  const readsRaw = readsRes.data || [];
  const voiceRaw = voiceRes.data || [];

  const users = profiles.map(mapProfile);
  const servers = serversRaw.map((s: any) => mapServer(s, membersRaw));
  const channels = channelsRaw.map(mapChannel);
  const messages = messagesRaw.map((m: any) => mapMessage(m, reactionsRaw));
  const friendships = friendshipsRaw.map(mapFriendship);

  const reads: Record<string, Record<string, number>> = {};
  reads[currentUserId] = {};
  readsRaw.forEach((r: any) => {
    reads[currentUserId][r.channel_key] = new Date(r.last_read_at).getTime();
  });

  const voice: Record<string, string[]> = {};
  voiceRaw.forEach((v: any) => {
    voice[v.channel_id] = voice[v.channel_id] || [];
    voice[v.channel_id].push(v.user_id);
  });

  const snap: DBSnapshot = {
    users,
    servers,
    channels,
    messages,
    friendships,
    reads,
    session: { userId: currentUserId },
    voice,
  };
  setCache(snap);
  return snap;
}

// ========== Helper ==========
function meId(): string {
  const id = _cache.session.userId;
  if (!id) throw new Error("غير مسجل دخول");
  return id;
}

function extractMentions(content: string, users: User[]): string[] {
  const ids: string[] = [];
  users.forEach((u) => {
    const re = new RegExp(`@${u.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    if (re.test(content)) ids.push(u.id);
  });
  return ids;
}

// ========== API ==========
export const api = {
  // ----- Auth -----
  async signup(email: string, password: string, username: string): Promise<void> {
    const e = email.trim().toLowerCase();
    const u = username.trim();
    if (u.length < 2) throw new Error("اسم المستخدم قصير");
    if (password.length < 6) throw new Error("كلمة السر لازم 6 حروف على الأقل");
    if (!e || !e.includes("@")) throw new Error("إيميل غير صحيح");

    const { error } = await supabase.auth.signUp({
      email: e,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: u },
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) throw new Error("الإيميل ده مسجّل قبل كده");
      throw new Error(error.message);
    }
  },

  async login(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid")) throw new Error("الإيميل أو الباسورد غلط");
      throw new Error(error.message);
    }
  },

  async logout() {
    // Best-effort: clear voice presence
    const me = _cache.session.userId;
    if (me) {
      await supabase.from("voice_presence").delete().eq("user_id", me);
    }
    await supabase.auth.signOut();
    setCache(emptyCache());
  },

  currentUser(): User | null {
    const id = _cache.session.userId;
    if (!id) return null;
    return _cache.users.find((u) => u.id === id) || null;
  },

  // ----- Profile -----
  async updateProfile(patch: Partial<Pick<User, "username" | "avatarUrl" | "avatarColor" | "bannerUrl" | "bio" | "status" | "customStatus">>) {
    const id = meId();
    const upd: any = {};
    if (patch.username !== undefined) upd.username = patch.username.trim();
    if (patch.avatarUrl !== undefined) upd.avatar_url = patch.avatarUrl;
    if (patch.bannerUrl !== undefined) upd.banner_url = patch.bannerUrl;
    if (patch.avatarColor) upd.avatar_color = patch.avatarColor;
    if (patch.bio !== undefined) upd.bio = patch.bio;
    if (patch.status) upd.status = patch.status;
    if (patch.customStatus !== undefined) upd.custom_status = patch.customStatus;
    const { error } = await supabase.from("profiles").update(upd).eq("id", id);
    if (error) throw new Error(error.message);
  },

  // ----- Servers -----
  async createServer(name: string, iconUrl?: string): Promise<Server> {
    const id = meId();
    const { data, error } = await supabase
      .from("servers")
      .insert({
        name: name.trim() || "سيرفر جديد",
        owner_id: id,
        icon_color: randomColor(),
        icon_url: iconUrl ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Trigger handle_new_server() auto-creates owner membership + default channels.
    return mapServer(data, [{ server_id: data.id, user_id: id, role: "owner", joined_at: new Date().toISOString(), nickname: null }]);
  },

  async updateServer(serverId: string, patch: Partial<Pick<Server, "name" | "iconUrl" | "iconColor">>) {
    const upd: any = {};
    if (patch.name) upd.name = patch.name.trim();
    if (patch.iconUrl !== undefined) upd.icon_url = patch.iconUrl;
    if (patch.iconColor) upd.icon_color = patch.iconColor;
    const { error } = await supabase.from("servers").update(upd).eq("id", serverId);
    if (error) throw new Error(error.message);
  },

  async deleteServer(serverId: string) {
    const { error } = await supabase.from("servers").delete().eq("id", serverId);
    if (error) throw new Error(error.message);
  },

  async joinServerByInvite(code: string): Promise<string> {
    const { data, error } = await supabase.rpc("join_server_by_invite", { _code: code.trim() });
    if (error) throw new Error("كود دعوة غير صحيح");
    return data as string;
  },

  async leaveServer(serverId: string) {
    const id = meId();
    const { error } = await supabase
      .from("server_members")
      .delete()
      .eq("server_id", serverId)
      .eq("user_id", id);
    if (error) throw new Error(error.message);
  },

  async setMemberRole(serverId: string, userId: string, role: Role) {
    const { error } = await supabase
      .from("server_members")
      .update({ role })
      .eq("server_id", serverId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  async setMemberNickname(serverId: string, userId: string, nickname: string) {
    const { error } = await supabase
      .from("server_members")
      .update({ nickname: nickname.trim() || null })
      .eq("server_id", serverId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  async kickMember(serverId: string, userId: string) {
    const { error } = await supabase
      .from("server_members")
      .delete()
      .eq("server_id", serverId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  // ----- Categories -----
  async addCategory(serverId: string, name: string) {
    const s = _cache.servers.find((x) => x.id === serverId);
    if (!s) return;
    const n = name.trim();
    if (!n || s.categories.includes(n)) return;
    const next = [...s.categories, n];
    const { error } = await supabase.from("servers").update({ categories: next }).eq("id", serverId);
    if (error) throw new Error(error.message);
  },

  async removeCategory(serverId: string, name: string) {
    const s = _cache.servers.find((x) => x.id === serverId);
    if (!s) return;
    const next = s.categories.filter((c) => c !== name);
    await supabase.from("servers").update({ categories: next }).eq("id", serverId);
    // Clear category from channels
    await supabase
      .from("channels")
      .update({ category: null })
      .eq("server_id", serverId)
      .eq("category", name);
  },

  // ----- Channels -----
  async createChannel(serverId: string, name: string, type: "text" | "voice", category?: string): Promise<void> {
    const { error } = await supabase.from("channels").insert({
      server_id: serverId,
      name: name.trim() || "قناة",
      type,
      category: category ?? null,
    });
    if (error) throw new Error(error.message);
  },

  async deleteChannel(channelId: string) {
    const { error } = await supabase.from("channels").delete().eq("id", channelId);
    if (error) throw new Error(error.message);
  },

  async renameChannel(channelId: string, name: string) {
    const { error } = await supabase
      .from("channels")
      .update({ name: name.trim() })
      .eq("id", channelId);
    if (error) throw new Error(error.message);
  },

  // ----- Messages -----
  async sendMessage(channelId: string, content: string, opts?: { attachments?: Attachment[]; replyToId?: string }) {
    const id = meId();
    const text = content.trim();
    if (!text && !(opts?.attachments?.length)) return;
    const mentions = extractMentions(text, _cache.users);

    let payload: any = {
      channel_key: channelId,
      user_id: id,
      content: text,
      mentions,
      attachments: opts?.attachments || [],
      reply_to_id: opts?.replyToId ?? null,
    };
    if (channelId.startsWith("dm:")) {
      // DM channel
      const ids = channelId.slice(3).split("_").sort();
      payload.dm_user_a = ids[0];
      payload.dm_user_b = ids[1];
    } else {
      payload.channel_id = channelId;
    }
    const { error } = await supabase.from("messages").insert(payload);
    if (error) throw new Error(error.message);
  },

  async editMessage(messageId: string, content: string) {
    const text = content.trim();
    const mentions = extractMentions(text, _cache.users);
    const { error } = await supabase
      .from("messages")
      .update({ content: text, edited_at: new Date().toISOString(), mentions })
      .eq("id", messageId);
    if (error) throw new Error(error.message);
  },

  async deleteMessage(messageId: string) {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) throw new Error(error.message);
  },

  async pinMessage(messageId: string) {
    const m = _cache.messages.find((x) => x.id === messageId);
    if (!m) return;
    const ch = _cache.channels.find((c) => c.id === m.channelId);
    if (!ch) return;
    const s = _cache.servers.find((s) => s.id === ch.serverId);
    if (!s) return;
    const has = s.pinnedMessageIds.includes(messageId);
    const next = has
      ? s.pinnedMessageIds.filter((id) => id !== messageId)
      : [...s.pinnedMessageIds, messageId];
    const { error } = await supabase.from("servers").update({ pinned_message_ids: next }).eq("id", s.id);
    if (error) throw new Error(error.message);
  },

  async toggleReaction(messageId: string, emoji: string) {
    const id = meId();
    const m = _cache.messages.find((x) => x.id === messageId);
    if (!m) return;
    const r = (m.reactions || []).find((r) => r.emoji === emoji);
    if (r && r.userIds.includes(id)) {
      await supabase.from("reactions").delete().eq("message_id", messageId).eq("user_id", id).eq("emoji", emoji);
    } else {
      await supabase.from("reactions").insert({ message_id: messageId, user_id: id, emoji });
    }
  },

  // ----- Read state -----
  async markRead(channelId: string) {
    const id = meId();
    await supabase
      .from("read_states")
      .upsert({ user_id: id, channel_key: channelId, last_read_at: new Date().toISOString() }, { onConflict: "user_id,channel_key" });
  },

  // ----- Voice -----
  async joinVoice(channelId: string) {
    const id = meId();
    // Leave all other voice channels first
    await supabase.from("voice_presence").delete().eq("user_id", id);
    await supabase.from("voice_presence").insert({ channel_id: channelId, user_id: id });
  },

  async leaveVoice(_channelId: string) {
    const id = _cache.session.userId;
    if (!id) return;
    await supabase.from("voice_presence").delete().eq("user_id", id);
  },

  // ----- Friends -----
  async sendFriendRequest(usernameOrId: string) {
    const id = meId();
    const target = _cache.users.find(
      (u) => u.id === usernameOrId || u.username.toLowerCase() === usernameOrId.trim().toLowerCase()
    );
    if (!target) throw new Error("المستخدم غير موجود");
    if (target.id === id) throw new Error("مينفعش تضيف نفسك");
    const existing = _cache.friendships.find(
      (f) => (f.fromId === id && f.toId === target.id) || (f.fromId === target.id && f.toId === id)
    );
    if (existing) throw new Error("في طلب أو صداقة بالفعل");
    const { error } = await supabase.from("friendships").insert({
      from_id: id,
      to_id: target.id,
      status: "pending",
    });
    if (error) throw new Error(error.message);
  },

  async acceptFriend(friendshipId: string) {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (error) throw new Error(error.message);
  },

  async rejectFriend(friendshipId: string) {
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) throw new Error(error.message);
  },

  async removeFriend(otherUserId: string) {
    const id = meId();
    await supabase
      .from("friendships")
      .delete()
      .or(`and(from_id.eq.${id},to_id.eq.${otherUserId}),and(from_id.eq.${otherUserId},to_id.eq.${id})`);
  },
};
