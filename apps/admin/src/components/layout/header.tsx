"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search,
  MessageSquare,
  Bell,
  LogOut
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  roles: string[];
  status: string;
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const formatName = (email: string) => {
    return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (email: string) => {
    const name = formatName(email);
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4 ml-64 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search..." 
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <MessageSquare className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">1</span>
            </div>
          </Button>
          
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                {getInitials(user.email)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {formatName(user.email)}
              </span>
              <Badge variant="secondary" className="text-xs w-fit">
                {user.roles[0]}
              </Badge>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onLogout}
              title="Logout"
              className="ml-2"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}