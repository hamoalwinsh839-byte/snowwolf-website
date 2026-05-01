-- Lock down SECURITY DEFINER functions: only authenticated users may call them.
REVOKE EXECUTE ON FUNCTION public.is_server_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_member_role(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_server_staff(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.channel_server_id(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.message_can_view(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_server_by_invite(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_server_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_server_staff(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.channel_server_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.message_can_view(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_server_by_invite(TEXT) TO authenticated;

-- Set search_path on touch_updated_at and handle_new_server (linter warning)
ALTER FUNCTION public.touch_updated_at() SET search_path = public;