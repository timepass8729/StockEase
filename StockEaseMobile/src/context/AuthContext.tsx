import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserData {
  uid: string;
  email: string | null;
  role: 'admin' | 'employee';
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            const userRole = data.role || 'employee';
            
            setUserData({
              uid: user.uid,
              email: user.email,
              role: userRole,
            });
          } else {
            console.error('No user data found in Firestore');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};