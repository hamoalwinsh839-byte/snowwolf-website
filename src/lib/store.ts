// SnowWolf — Local storage layer (v3 — Discord-like full features)

export type Role = "owner" | "admin" | "member";

export type User = {
  id: string;
  username: string;
  password: string;
  avatarColor: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  status: "online" | "idle" | "dnd" | "invisible";
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
  channelId: string; // for DMs: dm:{userIdA}_{userIdB} (sorted)
  userId: string;
  content: string;
  createdAt: number;
  editedAt?: number;
  reactions?: Reaction[];
  attachments?: Attachment[];
  replyToId?: string;
  mentions?: string[]; // user ids
};

export type FriendStatus = "pending" | "accepted" | "blocked";
export type Friendship = {
  id: string;
  fromId: string;
  toId: string;
  status: FriendStatus;
  createdAt: number;
};

export type ReadState = Record<string, number>; // channelId -> last read timestamp (per user)

type DB = {
  users: User[];
  servers: Server[];
  channels: Channel[];
  messages: Message[];
  friendships: Friendship[];
  reads: Record<string, ReadState>; // userId -> ReadState
  session: { userId: string | null };
  voice: Record<string, string[]>;
};

const KEY = "snowwolf.db.v3";

const COLORS = [
  "from-sky-400 to-blue-600",
  "from-cyan-400 to-blue-500",
  "from-indigo-400 to-blue-700",
  "from-blue-300 to-cyan-500",
  "from-slate-400 to-blue-600",
  "from-teal-400 to-sky-600",
];

function genInvite() { return Math.random().toString(36).slice(2, 10); }

export function dmChannelId(a: string, b: string) {
  return "dm:" + [a, b].sort().join("_");
}

function seed(): DB {
  const ownerId = "system-wolf";
  const serverId = crypto.randomUUID();
  const catGeneral = "عام";
  const catVoice = "صوت";
  return {
    users: [],
    servers: [
      {
        id: serverId,
        name: "Snow Wolf Pack",
        iconColor: "from-sky-400 to-blue-600",
        ownerId,
        members: [],
        inviteCode: genInvite(),
        categories: [catGeneral, catVoice],
        pinnedMessageIds: [],
        createdAt: Date.now(),
      },
    ],
    channels: [
      { id: crypto.randomUUID(), serverId, name: "ترحيب", type: "text", topic: "أهلا في القطيع 🐺", category: catGeneral },
      { id: crypto.randomUUID(), serverId, name: "عام", type: "text", category: catGeneral },
      { id: crypto.randomUUID(), serverId, name: "ميمز", type: "text", category: catGeneral },
      { id: crypto.randomUUID(), serverId, name: "اللوبي", type: "voice", category: catVoice },
      { id: crypto.randomUUID(), serverId, name: "جيمنج", type: "voice", category: catVoice },
    ],
    messages: [],
    friendships: [],
    reads: {},
    session: { userId: null },
    voice: {},
  };
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh = seed();
      localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    const db = JSON.parse(raw);
    // safety defaults for older shapes
    db.friendships = db.friendships || [];
    db.reads = db.reads || {};
    db.servers.forEach((s: Server) => {
      s.categories = s.categories || [];
      s.pinnedMessageIds = s.pinnedMessageIds || [];
    });
    return db;
  } catch {
    const fresh = seed();
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  }
}

export function saveDB(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("snowwolf:db"));
}

export function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

function extractMentions(content: string, users: User[]): string[] {
  const ids: string[] = [];
  users.forEach((u) => {
    const re = new RegExp(`@${u.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    if (re.test(content)) ids.push(u.id);
  });
  return ids;
}

export const api = {
  signup(username: string, password: string): User {
    const db = loadDB();
    const u = username.trim();
    if (u.length < 2) throw new Error("اسم المستخدم قصير");
    if (password.length < 4) throw new Error("كلمة السر ضعيفة");
    if (db.users.some((x) => x.username.toLowerCase() === u.toLowerCase()))
      throw new Error("الاسم مستخدم بالفعل");
    const isFirst = db.users.length === 0;
    const user: User = {
      id: crypto.randomUUID(),
      username: u,
      password,
      avatarColor: randomColor(),
      status: "online",
      createdAt: Date.now(),
    };
    db.users.push(user);
    db.servers.forEach((s) => {
      if (!s.members.find((m) => m.userId === user.id)) {
        s.members.push({ userId: user.id, role: isFirst ? "owner" : "member", joinedAt: Date.now() });
      }
      if (isFirst && s.ownerId === "system-wolf") s.ownerId = user.id;
    });
    db.session.userId = user.id;
    saveDB(db);
    return user;
  },

  login(username: string, password: string): User {
    const db = loadDB();
    const user = db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!user || user.password !== password) throw new Error("بيانات غير صحيحة");
    db.session.userId = user.id;
    user.status = "online";
    saveDB(db);
    return user;
  },

  logout() {
    const db = loadDB();
    Object.keys(db.voice).forEach((cid) => {
      db.voice[cid] = (db.voice[cid] || []).filter((id) => id !== db.session.userId);
    });
    db.session.userId = null;
    saveDB(db);
  },

  currentUser(): User | null {
    const db = loadDB();
    if (!db.session.userId) return null;
    return db.users.find((u) => u.id === db.session.userId) || null;
  },

  updateProfile(patch: Partial<Pick<User, "username" | "avatarUrl" | "avatarColor" | "bannerUrl" | "bio" | "status" | "customStatus" | "password">>) {
    const db = loadDB();
    const me = db.users.find((u) => u.id === db.session.userId);
    if (!me) throw new Error("غير مسجل");
    if (patch.username) {
      const u = patch.username.trim();
      if (u.length < 2) throw new Error("اسم قصير");
      if (db.users.some((x) => x.id !== me.id && x.username.toLowerCase() === u.toLowerCase()))
        throw new Error("الاسم مستخدم");
      me.username = u;
    }
    if (patch.avatarUrl !== undefined) me.avatarUrl = patch.avatarUrl;
    if (patch.bannerUrl !== undefined) me.bannerUrl = patch.bannerUrl;
    if (patch.avatarColor) me.avatarColor = patch.avatarColor;
    if (patch.bio !== undefined) me.bio = patch.bio;
    if (patch.status) me.status = patch.status;
    if (patch.customStatus !== undefined) me.customStatus = patch.customStatus;
    if (patch.password) {
      if (patch.password.length < 4) throw new Error("كلمة سر ضعيفة");
      me.password = patch.password;
    }
    saveDB(db);
    return me;
  },

  // ===== Servers =====
  createServer(name: string, iconUrl?: string): Server {
    const db = loadDB();
    const me = db.session.userId!;
    const cat1 = "عام", cat2 = "صوت";
    const server: Server = {
      id: crypto.randomUUID(),
      name: name.trim() || "سيرفر جديد",
      iconColor: randomColor(),
      iconUrl,
      ownerId: me,
      members: [{ userId: me, role: "owner", joinedAt: Date.now() }],
      inviteCode: genInvite(),
      categories: [cat1, cat2],
      pinnedMessageIds: [],
      createdAt: Date.now(),
    };
    db.servers.push(server);
    db.channels.push(
      { id: crypto.randomUUID(), serverId: server.id, name: "عام", type: "text", category: cat1 },
      { id: crypto.randomUUID(), serverId: server.id, name: "اللوبي", type: "voice", category: cat2 }
    );
    saveDB(db);
    return server;
  },

  updateServer(serverId: string, patch: Partial<Pick<Server, "name" | "iconUrl" | "iconColor">>) {
    const db = loadDB();
    const s = db.servers.find((x) => x.id === serverId);
    if (!s) return;
    if (patch.name) s.name = patch.name.trim() || s.name;
    if (patch.iconUrl !== undefined) s.iconUrl = patch.iconUrl;
    if (patch.iconColor) s.iconColor = patch.iconColor;
    saveDB(db);
  },

  deleteServer(serverId: string) {
    const db = loadDB();
    const me = db.session.userId;
    const s = db.servers.find((x) => x.id === serverId);
    if (!s || s.ownerId !== me) throw new Error("مش مسموح");
    db.servers = db.servers.filter((x) => x.id !== serverId);
    const channelIds = db.channels.filter((c) => c.serverId === serverId).map((c) => c.id);
    db.channels = db.channels.filter((c) => c.serverId !== serverId);
    db.messages = db.messages.filter((m) => !channelIds.includes(m.channelId));
    saveDB(db);
  },

  joinServerByInvite(code: string): Server {
    const db = loadDB();
    const me = db.session.userId!;
    const s = db.servers.find((x) => x.inviteCode === code.trim());
    if (!s) throw new Error("كود دعوة غير صحيح");
    if (!s.members.find((m) => m.userId === me)) {
      s.members.push({ userId: me, role: "member", joinedAt: Date.now() });
    }
    saveDB(db);
    return s;
  },

  leaveServer(serverId: string) {
    const db = loadDB();
    const me = db.session.userId;
    const s = db.servers.find((x) => x.id === serverId);
    if (!s || s.ownerId === me) return;
    s.members = s.members.filter((m) => m.userId !== me);
    saveDB(db);
  },

  setMemberRole(serverId: string, userId: string, role: Role) {
    const db = loadDB();
    const me = db.session.userId;
    const s = db.servers.find((x) => x.id === serverId);
    if (!s || s.ownerId !== me) throw new Error("مش مسموح");
    const m = s.members.find((m) => m.userId === userId);
    if (m && m.userId !== s.ownerId) m.role = role;
    saveDB(db);
  },

  setMemberNickname(serverId: string, userId: string, nickname: string) {
    const db = loadDB();
    const s = db.servers.find((x) => x.id === serverId);
    const m = s?.members.find((m) => m.userId === userId);
    if (m) m.nickname = nickname.trim() || undefined;
    saveDB(db);
  },

  kickMember(serverId: string, userId: string) {
    const db = loadDB();
    const me = db.session.userId;
    const s = db.servers.find((x) => x.id === serverId);
    if (!s) return;
    const myRole = s.members.find((m) => m.userId === me)?.role;
    if (myRole !== "owner" && myRole !== "admin") throw new Error("مش مسموح");
    if (userId === s.ownerId) return;
    s.members = s.members.filter((m) => m.userId !== userId);
    saveDB(db);
  },

  // ===== Categories =====
  addCategory(serverId: string, name: string) {
    const db = loadDB();
    const s = db.servers.find((x) => x.id === serverId);
    if (!s) return;
    const n = name.trim();
    if (!n || s.categories.includes(n)) return;
    s.categories.push(n);
    saveDB(db);
  },

  removeCategory(serverId: string, name: string) {
    const db = loadDB();
    const s = db.servers.find((x) => x.id === serverId);
    if (!s) return;
    s.categories = s.categories.filter((c) => c !== name);
    db.channels.forEach((c) => { if (c.serverId === serverId && c.category === name) c.category = undefined; });
    saveDB(db);
  },

  // ===== Channels =====
  createChannel(serverId: string, name: string, type: "text" | "voice", category?: string): Channel {
    const db = loadDB();
    const channel: Channel = { id: crypto.randomUUID(), serverId, name: name.trim() || "قناة", type, category };
    db.channels.push(channel);
    saveDB(db);
    return channel;
  },

  deleteChannel(channelId: string) {
    const db = loadDB();
    db.channels = db.channels.filter((c) => c.id !== channelId);
    db.messages = db.messages.filter((m) => m.channelId !== channelId);
    saveDB(db);
  },

  renameChannel(channelId: string, name: string) {
    const db = loadDB();
    const c = db.channels.find((c) => c.id === channelId);
    if (c) c.name = name.trim() || c.name;
    saveDB(db);
  },

  // ===== Messages =====
  sendMessage(channelId: string, content: string, opts?: { attachments?: Attachment[]; replyToId?: string }) {
    const db = loadDB();
    if (!db.session.userId) return;
    const text = content.trim();
    if (!text && !(opts?.attachments?.length)) return;
    const mentions = extractMentions(text, db.users);
    db.messages.push({
      id: crypto.randomUUID(),
      channelId,
      userId: db.session.userId,
      content: text,
      createdAt: Date.now(),
      reactions: [],
      attachments: opts?.attachments,
      replyToId: opts?.replyToId,
      mentions,
    });
    saveDB(db);
  },

  editMessage(messageId: string, content: string) {
    const db = loadDB();
    const m = db.messages.find((x) => x.id === messageId);
    if (!m || m.userId !== db.session.userId) return;
    m.content = content.trim();
    m.editedAt = Date.now();
    m.mentions = extractMentions(m.content, db.users);
    saveDB(db);
  },

  deleteMessage(messageId: string) {
    const db = loadDB();
    const m = db.messages.find((x) => x.id === messageId);
    if (!m) return;
    if (m.userId !== db.session.userId) {
      const ch = db.channels.find((c) => c.id === m.channelId);
      const s = db.servers.find((s) => s.id === ch?.serverId);
      const myRole = s?.members.find((mm) => mm.userId === db.session.userId)?.role;
      if (myRole !== "owner" && myRole !== "admin") return;
    }
    db.messages = db.messages.filter((x) => x.id !== messageId);
    db.servers.forEach((s) => { s.pinnedMessageIds = s.pinnedMessageIds.filter((id) => id !== messageId); });
    saveDB(db);
  },

  pinMessage(messageId: string) {
    const db = loadDB();
    const m = db.messages.find((x) => x.id === messageId);
    if (!m) return;
    const ch = db.channels.find((c) => c.id === m.channelId);
    const s = db.servers.find((s) => s.id === ch?.serverId);
    if (!s) return;
    if (!s.pinnedMessageIds.includes(messageId)) s.pinnedMessageIds.push(messageId);
    else s.pinnedMessageIds = s.pinnedMessageIds.filter((id) => id !== messageId);
    saveDB(db);
  },

  toggleReaction(messageId: string, emoji: string) {
    const db = loadDB();
    const me = db.session.userId;
    if (!me) return;
    const m = db.messages.find((x) => x.id === messageId);
    if (!m) return;
    m.reactions = m.reactions || [];
    let r = m.reactions.find((r) => r.emoji === emoji);
    if (!r) {
      r = { emoji, userIds: [me] };
      m.reactions.push(r);
    } else if (r.userIds.includes(me)) {
      r.userIds = r.userIds.filter((id) => id !== me);
      if (r.userIds.length === 0) m.reactions = m.reactions.filter((x) => x.emoji !== emoji);
    } else {
      r.userIds.push(me);
    }
    saveDB(db);
  },

  // ===== Read state =====
  markRead(channelId: string) {
    const db = loadDB();
    const me = db.session.userId;
    if (!me) return;
    db.reads[me] = db.reads[me] || {};
    db.reads[me][channelId] = Date.now();
    saveDB(db);
  },

  // ===== Voice =====
  joinVoice(channelId: string) {
    const db = loadDB();
    const me = db.session.userId;
    if (!me) return;
    Object.keys(db.voice).forEach((cid) => {
      db.voice[cid] = (db.voice[cid] || []).filter((id) => id !== me);
    });
    db.voice[channelId] = [...(db.voice[channelId] || []), me];
    saveDB(db);
  },

  leaveVoice(channelId: string) {
    const db = loadDB();
    const me = db.session.userId;
    if (!me) return;
    db.voice[channelId] = (db.voice[channelId] || []).filter((id) => id !== me);
    saveDB(db);
  },

  // ===== Friends =====
  sendFriendRequest(usernameOrId: string) {
    const db = loadDB();
    const me = db.session.userId;
    if (!me) return;
    const target = db.users.find(
      (u) => u.id === usernameOrId || u.username.toLowerCase() === usernameOrId.trim().toLowerCase()
    );
    if (!target) throw new Error("المستخدم غير موجود");
    if (target.id === me) throw new Error("مينفعش تضيف نفسك");
    const existing = db.friendships.find(
      (f) => (f.fromId === me && f.toId === target.id) || (f.fromId === target.id && f.toId === me)
    );
    if (existing) throw new Error("في طلب أو صداقة بالفعل");
    db.friendships.push({
      id: crypto.randomUUID(),
      fromId: me,
      toId: target.id,
      status: "pending",
      createdAt: Date.now(),
    });
    saveDB(db);
  },

  acceptFriend(friendshipId: string) {
    const db = loadDB();
    const f = db.friendships.find((x) => x.id === friendshipId);
    if (f && f.toId === db.session.userId) f.status = "accepted";
    saveDB(db);
  },

  rejectFriend(friendshipId: string) {
    const db = loadDB();
    db.friendships = db.friendships.filter((x) => x.id !== friendshipId);
    saveDB(db);
  },

  removeFriend(otherUserId: string) {
    const db = loadDB();
    const me = db.session.userId;
    db.friendships = db.friendships.filter(
      (f) => !((f.fromId === me && f.toId === otherUserId) || (f.fromId === otherUserId && f.toId === me))
    );
    saveDB(db);
  },
};
