
"use client";

import Link from "next/link";
import { useState } from "react";
import { Languages, Menu, LogOut, UserCheck, Home, Wallet, User as UserIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "./ui/separator";

const NavLink = ({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) => (
    <Link href={href} passHref>
        <Button variant="ghost" className="w-full justify-start text-lg font-medium" onClick={onClick}>
            {children}
        </Button>
    </Link>
);


export function Header() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };
  
  const getUserTypeDisplay = () => {
    if (!user) return null;
    if (user.userType === 'partner') {
      return `Partner: ${user.partnerType}`;
    }
    return 'Public User';
  }
  
  const renderNavLinks = () => {
    if (!user) {
        return (
            <>
                <NavLink href="/signin" onClick={handleLinkClick}>
                    <LogOut className="mr-2 h-5 w-5" /> Login
                </NavLink>
                <NavLink href="/signup" onClick={handleLinkClick}>
                    <UserIcon className="mr-2 h-5 w-5" /> Signup
                </NavLink>
            </>
        )
    }
    
    return (
        <>
            <NavLink href="/" onClick={handleLinkClick}>
                <Home className="mr-2 h-5 w-5" /> Home
            </NavLink>
             {user.userType === 'partner' && (
                <NavLink href="/wallet" onClick={handleLinkClick}>
                    <Wallet className="mr-2 h-5 w-5" /> Wallet
                </NavLink>
            )}
            <NavLink href="/account" onClick={handleLinkClick}>
                <UserIcon className="mr-2 h-5 w-5" /> Account
            </NavLink>
            <Button
                variant="ghost"
                className="w-full justify-start text-lg font-medium hover:text-destructive"
                onClick={() => {
                  logout();
                  handleLinkClick();
                }}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Logout
            </Button>
        </>
    )
  }

  return (
    <header className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            HelpNow
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Languages />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem>Español</DropdownMenuItem>
              <DropdownMenuItem>Français</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col w-64 px-2">
              <SheetHeader>
                  <SheetTitle className="sr-only">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-8">
                {renderNavLinks()}
              </nav>
              {user && (
                 <div className="mt-auto pt-4">
                  <Separator />
                   <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
                    <UserCheck className="h-5 w-5" />
                    <p className="capitalize font-medium">{getUserTypeDisplay()}</p>
                   </div>
                 </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
