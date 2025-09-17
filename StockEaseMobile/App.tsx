import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import SalesScreen from './src/screens/SalesScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SuppliersScreen from './src/screens/SuppliersScreen';
import StockAlertsScreen from './src/screens/StockAlertsScreen';

// Navigation
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { useAuth } from './src/context/AuthContext';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return null; // You can add a loading screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <PaperProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}