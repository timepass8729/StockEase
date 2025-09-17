import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import SalesScreen from '../screens/SalesScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import StockAlertsScreen from '../screens/StockAlertsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigators for each tab
const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="DashboardMain" 
      component={DashboardScreen} 
      options={{ title: 'Dashboard' }}
    />
  </Stack.Navigator>
);

const InventoryStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="InventoryMain" 
      component={InventoryScreen} 
      options={{ title: 'Inventory' }}
    />
    <Stack.Screen 
      name="StockAlerts" 
      component={StockAlertsScreen} 
      options={{ title: 'Stock Alerts' }}
    />
    <Stack.Screen 
      name="Suppliers" 
      component={SuppliersScreen} 
      options={{ title: 'Suppliers' }}
    />
  </Stack.Navigator>
);

const SalesStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="SalesMain" 
      component={SalesScreen} 
      options={{ title: 'Sales' }}
    />
  </Stack.Navigator>
);

const ReportsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ReportsMain" 
      component={ReportsScreen} 
      options={{ title: 'Reports' }}
    />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="SettingsMain" 
      component={SettingsScreen} 
      options={{ title: 'Settings' }}
    />
  </Stack.Navigator>
);

const MainTabNavigator = () => {
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Sales') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Sales" component={SalesStack} />
      <Tab.Screen name="Reports" component={ReportsStack} />
      {isAdmin && (
        <Tab.Screen name="Settings" component={SettingsStack} />
      )}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;