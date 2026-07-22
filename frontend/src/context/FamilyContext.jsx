import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMembers } from '../api';

const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMembers = useCallback(async () => {
    const data = await getMembers();
    setMembers(data);
    setCurrentMember(prev => prev ? data.find(m => m.id === prev.id) ?? data[0] : data[0]);
    setLoading(false);
  }, []);

  useEffect(() => { refreshMembers(); }, [refreshMembers]);

  const isAdmin  = !!currentMember?.is_admin;
  const isParent = currentMember?.role === 'parent';

  return (
    <FamilyContext.Provider value={{
      members, currentMember, setCurrentMember, refreshMembers, loading,
      isAdmin, isParent,
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export const useFamily = () => useContext(FamilyContext);
