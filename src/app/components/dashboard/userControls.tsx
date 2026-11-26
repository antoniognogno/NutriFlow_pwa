'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Settings } from "lucide-react";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { readProfileAvatar, type ProfileAvatarConfig } from "@/features/profile/avatarStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserControls() {
  const router = useRouter();
  const supabase = createClient();
  const [avatarConfig, setAvatarConfig] = useState<ProfileAvatarConfig>(() => readProfileAvatar());

  useEffect(() => {
    const refreshAvatar = () => setAvatarConfig(readProfileAvatar());
    window.addEventListener('nutriflow:avatar-updated', refreshAvatar);
    window.addEventListener('nutriflow:data-updated', refreshAvatar);
    return () => {
      window.removeEventListener('nutriflow:avatar-updated', refreshAvatar);
      window.removeEventListener('nutriflow:data-updated', refreshAvatar);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label="Menu profilo" className="relative size-9 rounded-full p-0">
          <ProfileAvatar config={avatarConfig} className="size-9" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Profilo</p>
            <p className="text-xs leading-none text-muted-foreground">
              Gestisci le tue impostazioni
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Impostazioni</span>
            </Link>
          </DropdownMenuItem>
          {/* IL SOTTOMENU PER IL TEMA È STATO RIMOSSO DA QUI */}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}