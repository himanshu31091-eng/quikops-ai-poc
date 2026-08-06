import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROLE_META } from "@/src/config/app-config";
import type { User } from "@/src/domain/types";
import { initials } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import { Icon } from "./icon";

interface OwnerAvatarProps {
  user: User | null;
  size?: "sm" | "md";
  showName?: boolean;
  showRole?: boolean;
  className?: string;
}

export function OwnerAvatar({
  user,
  size = "md",
  showName = true,
  showRole = false,
  className,
}: OwnerAvatarProps) {
  const dimension = size === "sm" ? "size-5" : "size-6";

  if (!user) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-high-content",
          className,
        )}
      >
        <span
          className={cn(
            dimension,
            "flex items-center justify-center rounded-full border border-dashed border-high-line bg-high-subtle",
          )}
        >
          <Icon name="CircleAlert" size="xs" className="text-high" />
        </span>
        {showName ? "Unassigned" : null}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Avatar className={dimension}>
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      {showName ? (
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-content">
            {user.name}
          </span>
          {showRole ? (
            <span className="block truncate text-2xs text-content-tertiary">
              {ROLE_META[user.role].label}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
