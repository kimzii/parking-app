"use client";

import {
  Search,
  Bell,
  Plus,
  LogOut
} from "lucide-react";

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
  // Helper to format name from email (e.g. "john.doe@..." -> "John Doe")
  const formatName = (email: string) => {
    if (!email) return "User";
    return email.split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (email: string) => {
    if (!email) return "U";
    const name = formatName(email);
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  return (
    <header className="bg-white px-8 py-4 sticky top-0 z-10 w-full border-b border-gray-100">
      <div className="flex items-center justify-between gap-8">

       {/* Search Bar */}
        <div className="relative w-[500px]">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-gray-50 pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#005f56] focus:border-transparent focus:bg-white outline-none text-gray-700 transition-all"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Plus size={20} />
          </button>

          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500 relative transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="flex items-center gap-4 pl-4 border-l border-gray-200 ml-3">
            {/* User Avatar */}
            <div className="w-10 h-10 bg-[#005f56] rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {getInitials(user.email)}
            </div>

            <div className="flex flex-col min-w-[80px]">
              <span className="font-semibold text-gray-800 text-sm leading-tight">
                {formatName(user.email)}
              </span>
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
                {user.roles?.[0] || "Admin"}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}