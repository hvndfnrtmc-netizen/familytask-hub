import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import MemberAvatar from './components/MemberAvatar';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Members from './pages/Members';
import Rewards from './pages/Rewards';

const NAV_ITEMS = [
  { to: '/', label: '总览', icon: '🏠' },
  { to: '/tasks', label: '任务', icon: '📋' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/members', label: '成员', icon: '👨‍👩‍👧' },
  { to: '/rewards', label: '积分商城', icon: '🎁' },
];

function Header() {
  const { members, currentMember, setCurrentMember } = useFamily();

  return (
    <header className="bg-white border-b border-orange-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        <span className="text-xl font-bold text-primary shrink-0">🏡 FamilyTask</span>

        <nav className="flex gap-1 flex-1 overflow-x-auto">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
                 ${isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-orange-50'}`}>
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          {members.map(m => (
            <MemberAvatar key={m.id} member={m} size="sm"
              selected={m.id === currentMember?.id}
              onClick={() => setCurrentMember(m)} />
          ))}
        </div>
      </div>
    </header>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-orange-50">
      <Header />
      <main className="max-w-5xl mx-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/members" element={<Members />} />
          <Route path="/rewards" element={<Rewards />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FamilyProvider>
        <AppLayout />
      </FamilyProvider>
    </BrowserRouter>
  );
}
