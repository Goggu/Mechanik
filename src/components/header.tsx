
"use client";

import Link from "next/link";
import { useState } from "react";
import { Languages, Menu, LogOut } from "lucide-react";

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

export function Header() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };

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
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                {!user ? (
                  <>
                    <Link
                      href="/signin"
                      className="text-lg font-medium hover:text-primary"
                      onClick={handleLinkClick}
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      className="text-lg font-medium hover:text-primary"
                      onClick={handleLinkClick}
                    >
                      Signup
                    </Link>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    className="justify-start p-0 text-lg font-medium hover:text-destructive"
                    onClick={() => {
                      logout();
                      handleLinkClick();
                    }}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Logout
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
