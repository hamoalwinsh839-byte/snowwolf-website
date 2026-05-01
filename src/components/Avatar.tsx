import { User } from "@/lib/store";

type Size = "xs" | "sm" | "md" | "lg" | "xl";
const sizeMap: Record<Size, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-24 h-24 text-3xl",
};

const statusColor = {
  online: "bg-success",
  idle: "bg-yellow-500",
  dnd: "bg-destructive",
  invisible: "bg-muted-foreground",
};

export default function Avatar({
  user,
  size = "md",
  showStatus = false,
  ring = false,
}: {
  user: Pick<User, "username" | "avatarColor" | "avatarUrl" | "status">;
  size?: Size;
  showStatus?: boolean;
  ring?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.username}
          className={`${sizeMap[size]} rounded-full object-cover ${ring ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
        />
      ) : (
        <div
          className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-bold text-white ${ring ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
        >
          {user.username[0]?.toUpperCase()}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${size === "xl" ? "w-6 h-6 border-[3px]" : size === "lg" ? "w-4 h-4 border-2" : "w-3 h-3 border-2"} rounded-full border-background ${statusColor[user.status]}`}
        />
      )}
    </div>
  );
}
