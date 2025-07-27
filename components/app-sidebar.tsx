'use client';

import type { User } from 'next-auth';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useNavigationWithLoading } from '@/hooks/use-navigation-with-loading';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavigationLink } from './navigation-link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ user }: { user: User | undefined }) {
  const { push, refresh } = useNavigationWithLoading();
  const { setOpenMobile } = useSidebar();
  const { theme } = useTheme();

  const faviconSrc = theme === 'dark' ? '/favicon_dark.svg' : '/favicon.svg';

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <NavigationLink
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <div className="flex items-center gap-2 px-2 hover:bg-muted rounded-md cursor-pointer">
                <Image
                  src={faviconSrc}
                  alt="All AI Chats"
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                />
                <span className="text-lg font-semibold">
                  All AI Chats
                </span>
              </div>
            </NavigationLink>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    push('/');
                    refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
