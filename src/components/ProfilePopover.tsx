import { User } from "@/lib/store";
import Avatar from "./Avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "./ui/button";
import { MessageCircle, UserPlus } from "lucide-react";

export default function ProfilePopover({
  user, children, onMessage, onAddFriend, isFriend, isMe,
}: {
  user: User;
  children: React.ReactNode;
  onMessage?: () => void;
  onAddFriend?: () => void;
  isFriend?: boolean;
  isMe?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0 bg-popover border-border overflow-hidden" side="left">
        <div className="h-16 bg-gradient-ice relative">
          {user.bannerUrl && <img src={user.bannerUrl} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="px-4 pb-4 -mt-8">
          <div className="mb-3"><Avatar user={user} size="lg" showStatus ring /></div>
          <div className="font-display text-xl font-bold">{user.username}</div>
          {user.customStatus && <div className="text-sm text-muted-foreground mt-0.5">{user.customStatus}</div>}
          {user.bio && (
            <>
              <div className="h-px bg-border my-3" />
              <div className="text-xs font-bold text-muted-foreground uppercase mb-1">نبذة</div>
              <p className="text-sm whitespace-pre-wrap break-words">{user.bio}</p>
            </>
          )}
          <div className="h-px bg-border my-3" />
          <div className="text-[10px] text-muted-foreground">
            انضم في {new Date(user.createdAt).toLocaleDateString("ar-EG")}
          </div>
          {!isMe && (
            <div className="flex gap-2 mt-3">
              {onMessage && (
                <Button size="sm" onClick={onMessage} className="flex-1 bg-gradient-ice text-primary-foreground">
                  <MessageCircle className="w-4 h-4 ml-1" /> رسالة
                </Button>
              )}
              {onAddFriend && !isFriend && (
                <Button size="sm" variant="outline" onClick={onAddFriend}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
