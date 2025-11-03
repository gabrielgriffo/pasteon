import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { Wrench, FileText } from 'lucide-react';
import { RequestBuilder } from '@/features/api-tester/RequestBuilder';
import { AutoDocs } from '@/features/auto-docs/AutoDocs';

type Page = 'request-builder' | 'auto-docs';

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('request-builder');

  const menuItems = [
    {
      id: 'request-builder' as Page,
      title: 'Request Builder',
      icon: Wrench,
    },
    {
      id: 'auto-docs' as Page,
      title: 'Auto Docs',
      icon: FileText,
    },
  ];

  return (
    <>
      <Toaster />
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">Pasteon</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setCurrentPage(item.id)}
                    isActive={currentPage === item.id}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="flex-1 overflow-auto">
            {currentPage === 'request-builder' && <RequestBuilder />}
            {currentPage === 'auto-docs' && <AutoDocs />}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
