-- =========================================================
-- SnowWolf Backend Schema
-- =========================================================

-- ============ ENUMS ============
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.user_status AS ENUM ('online', 'idle', 'dnd', 'invisible');
CREATE TYPE public.channel_type AS ENUM ('text', 'voice');
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'blocked');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  avatar_color TEXT NOT NULL DEFAULT 'from-sky-400 to-blue-600',
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  status public.user_status NOT NULL DEFAULT 'online',
  custom_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ SERVERS ============
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon_color TEXT NOT NULL DEFAULT 'from-sky-400 to-blue-600',
  icon_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  categories TEXT[] NOT NULL DEFAULT ARRAY['عام','صوت']::TEXT[],
  pinned_message_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- ============ SERVER MEMBERS ============
CREATE TABLE public.server_members (
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'member',
  nickname TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_server_members_user ON public.server_members(user_id);

-- ============ CHANNELS ============
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.channel_type NOT NULL DEFAULT 'text',
  topic TEXT,
  category TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_channels_server ON public.channels(server_id);

-- ============ MESSAGES ============
-- channel_key: either a channels.id::text or 'dm:<userA>_<userB>' (sorted)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key TEXT NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_user_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dm_user_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_to_id UUID,
  mentions UUID[] NOT NULL DEFAULT '{}',
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_channel_key ON public.messages(channel_key, created_at);
CREATE INDEX idx_messages_user ON public.messages(user_id);

-- ============ REACTIONS ============
CREATE TABLE public.reactions (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- ============ FRIENDSHIPS ============
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- ============ READ STATES ============
CREATE TABLE public.read_states (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_key TEXT NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_key)
);

ALTER TABLE public.read_states ENABLE ROW LEVEL SECURITY;

-- ============ VOICE PRESENCE ============
CREATE TABLE public.voice_presence (
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

ALTER TABLE public.voice_presence ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_server_member(_server_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = _server_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_member_role(_server_id UUID, _user_id UUID)
RETURNS public.member_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.server_members
  WHERE server_id = _server_id AND user_id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_server_staff(_server_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = _server_id AND user_id = _user_id
      AND role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.channel_server_id(_channel_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT server_id FROM public.channels WHERE id = _channel_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.message_can_view(_msg_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = _msg_id
      AND (
        (m.channel_id IS NOT NULL AND public.is_server_member(public.channel_server_id(m.channel_id), _user_id))
        OR (m.channel_id IS NULL AND (m.dm_user_a = _user_id OR m.dm_user_b = _user_id))
      )
  );
$$;

-- =========================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username TEXT;
  _color TEXT;
  _colors TEXT[] := ARRAY[
    'from-sky-400 to-blue-600',
    'from-cyan-400 to-blue-500',
    'from-indigo-400 to-blue-700',
    'from-blue-300 to-cyan-500',
    'from-slate-400 to-blue-600',
    'from-teal-400 to-sky-600'
  ];
BEGIN
  _username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  _color := _colors[1 + floor(random() * array_length(_colors, 1))::int];

  -- Ensure unique username by appending suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = _username) LOOP
    _username := _username || floor(random() * 1000)::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, avatar_color)
  VALUES (NEW.id, _username, _color);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- AUTO-ADD OWNER WHEN SERVER CREATED
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;

  -- Default channels
  INSERT INTO public.channels (server_id, name, type, category, position)
  VALUES
    (NEW.id, 'عام', 'text', 'عام', 0),
    (NEW.id, 'اللوبي', 'voice', 'صوت', 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_server_created
AFTER INSERT ON public.servers
FOR EACH ROW EXECUTE FUNCTION public.handle_new_server();

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles: anyone authenticated can read; only owner can update
CREATE POLICY "profiles_select_all_auth" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- servers
CREATE POLICY "servers_select_member_or_invite" ON public.servers
  FOR SELECT TO authenticated
  USING (public.is_server_member(id, auth.uid()));
CREATE POLICY "servers_insert_self_owner" ON public.servers
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "servers_update_owner" ON public.servers
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "servers_delete_owner" ON public.servers
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- server_members
CREATE POLICY "members_select_same_server" ON public.server_members
  FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
-- self-join (used after invite redemption); staff handle others via RPC if needed
CREATE POLICY "members_insert_self" ON public.server_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update_staff_or_self_nickname" ON public.server_members
  FOR UPDATE TO authenticated
  USING (
    public.is_server_staff(server_id, auth.uid()) OR user_id = auth.uid()
  );
CREATE POLICY "members_delete_staff_or_self" ON public.server_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR public.is_server_staff(server_id, auth.uid())
  );

-- channels
CREATE POLICY "channels_select_member" ON public.channels
  FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "channels_insert_staff" ON public.channels
  FOR INSERT TO authenticated
  WITH CHECK (public.is_server_staff(server_id, auth.uid()));
CREATE POLICY "channels_update_staff" ON public.channels
  FOR UPDATE TO authenticated
  USING (public.is_server_staff(server_id, auth.uid()));
CREATE POLICY "channels_delete_staff" ON public.channels
  FOR DELETE TO authenticated
  USING (public.is_server_staff(server_id, auth.uid()));

-- messages
CREATE POLICY "messages_select_visible" ON public.messages
  FOR SELECT TO authenticated
  USING (
    (channel_id IS NOT NULL AND public.is_server_member(public.channel_server_id(channel_id), auth.uid()))
    OR (channel_id IS NULL AND (dm_user_a = auth.uid() OR dm_user_b = auth.uid()))
  );
CREATE POLICY "messages_insert_self" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (channel_id IS NOT NULL AND public.is_server_member(public.channel_server_id(channel_id), auth.uid()))
      OR (channel_id IS NULL AND (dm_user_a = auth.uid() OR dm_user_b = auth.uid()))
    )
  );
CREATE POLICY "messages_update_owner" ON public.messages
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "messages_delete_owner_or_staff" ON public.messages
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (channel_id IS NOT NULL AND public.is_server_staff(public.channel_server_id(channel_id), auth.uid()))
  );

-- reactions
CREATE POLICY "reactions_select_visible" ON public.reactions
  FOR SELECT TO authenticated
  USING (public.message_can_view(message_id, auth.uid()));
CREATE POLICY "reactions_insert_self" ON public.reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.message_can_view(message_id, auth.uid()));
CREATE POLICY "reactions_delete_self" ON public.reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- friendships
CREATE POLICY "friendships_select_parties" ON public.friendships
  FOR SELECT TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "friendships_insert_self" ON public.friendships
  FOR INSERT TO authenticated WITH CHECK (from_id = auth.uid());
CREATE POLICY "friendships_update_parties" ON public.friendships
  FOR UPDATE TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "friendships_delete_parties" ON public.friendships
  FOR DELETE TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());

-- read_states
CREATE POLICY "reads_select_self" ON public.read_states
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "reads_upsert_self" ON public.read_states
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reads_update_self" ON public.read_states
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- voice_presence
CREATE POLICY "voice_select_member" ON public.voice_presence
  FOR SELECT TO authenticated
  USING (public.is_server_member(public.channel_server_id(channel_id), auth.uid()));
CREATE POLICY "voice_insert_self" ON public.voice_presence
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "voice_update_self" ON public.voice_presence
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "voice_delete_self" ON public.voice_presence
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- RPC: join server by invite code (self-only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.join_server_by_invite(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _server_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT id INTO _server_id FROM public.servers WHERE invite_code = _code;
  IF _server_id IS NULL THEN
    RAISE EXCEPTION 'invalid invite code';
  END IF;
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (_server_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;
  RETURN _server_id;
END;
$$;

-- =========================================================
-- REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_presence;

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('snowwolf-media', 'snowwolf-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'snowwolf-media');
CREATE POLICY "media_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'snowwolf-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'snowwolf-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'snowwolf-media' AND (storage.foldername(name))[1] = auth.uid()::text);
