
import React, { useContext, useState } from 'react';
// FIX: Split imports from 'react-router-dom' and 'react-router' to handle potential module resolution issues.
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { AuthContext } from '../App';
import { LayoutDashboardIcon, ListCollapseIcon, SignOutIcon, MoonIcon, SunIcon, UserIcon, SettingsIcon } from './Icons';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

interface LayoutProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, isDarkMode, toggleDarkMode }) => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLogoutConfirmOpen(false);
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      navigate('/admin/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      setIsLoggingOut(false);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center p-2 rounded-lg transition-colors duration-200 ${
      isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
    } ${isSidebarOpen ? 'justify-start' : 'justify-center'}`;

  return (
    <>
      <div className="flex h-screen bg-secondary">
        {/* Sidebar */}
        <aside className={`bg-card border-r border-border flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
          <div className={`flex items-center p-4 border-b border-border ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {isSidebarOpen && <h1 className="text-xl font-bold text-primary">Enterprise Forms</h1>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-secondary">
              <ListCollapseIcon className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <NavLink to="/admin/dashboard" className={navLinkClass}>
              <LayoutDashboardIcon className="w-6 h-6" />
              {isSidebarOpen && <span className="ml-4">Dashboard</span>}
            </NavLink>
            <NavLink to="/admin/campaigns" className={navLinkClass}>
              <ListCollapseIcon className="w-6 h-6" />
              {isSidebarOpen && <span className="ml-4">Campaigns</span>}
            </NavLink>
            <NavLink to="/admin/settings" className={navLinkClass}>
              <SettingsIcon className="w-6 h-6" />
              {isSidebarOpen && <span className="ml-4">Settings</span>}
            </NavLink>
          </nav>
          <div className="p-4 border-t border-border">
            <button onClick={() => setIsLogoutConfirmOpen(true)} className={`flex items-center w-full p-2 rounded-lg hover:bg-secondary transition-colors duration-200 ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}>
              <SignOutIcon className="w-6 h-6" />
              {isSidebarOpen && <span className="ml-4">Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-card border-b border-border flex items-center justify-end p-4 h-16">
            <div className="flex items-center space-x-4">
              <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-secondary">
                {isDarkMode ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-gray-700" />}
              </button>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-secondary rounded-full">
                  <UserIcon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium hidden md:block">{currentUser?.displayName || currentUser?.email}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
      
      <Modal isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} title="Confirm Sign Out" size="sm">
        <p>Are you sure you want to sign out?</p>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="secondary" onClick={() => setIsLogoutConfirmOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </Modal>

      {isLoggingOut && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Spinner size="lg" />
        </div>
      )}
    </>
  );
};

export default Layout;