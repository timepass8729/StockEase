import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { logoutUser } from '../lib/firebase';

const SettingsScreen = () => {
  const { userData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
              Alert.alert('Success', 'Logged out successfully');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightComponent 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color="#0284c7" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileIcon}>
              <Ionicons name="person" size={32} color="#0284c7" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userData?.email}</Text>
              <Text style={styles.profileRole}>
                {userData?.role === 'admin' ? 'Administrator' : 'Employee'}
              </Text>
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Toggle dark theme"
            rightComponent={
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: '#e5e7eb', true: '#0284c7' }}
                thumbColor={theme === 'dark' ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable push notifications"
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e5e7eb', true: '#0284c7' }}
                thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            icon="alert-circle-outline"
            title="Low Stock Alerts"
            subtitle="Get notified when items are low"
            rightComponent={
              <Switch
                value={lowStockAlerts}
                onValueChange={setLowStockAlerts}
                trackColor={{ false: '#e5e7eb', true: '#0284c7' }}
                thumbColor={lowStockAlerts ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            icon="cloud-outline"
            title="Auto Backup"
            subtitle="Automatically backup your data"
            rightComponent={
              <Switch
                value={autoBackup}
                onValueChange={setAutoBackup}
                trackColor={{ false: '#e5e7eb', true: '#0284c7' }}
                thumbColor={autoBackup ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <SettingItem
            icon="download-outline"
            title="Export Data"
            subtitle="Download your data"
            onPress={() => Alert.alert('Info', 'Export functionality coming soon')}
          />
          <SettingItem
            icon="trash-outline"
            title="Clear Cache"
            subtitle="Clear app cache and temporary files"
            onPress={() => Alert.alert('Info', 'Cache cleared successfully')}
          />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <SettingItem
            icon="help-circle-outline"
            title="Help & FAQ"
            subtitle="Get help and find answers"
            onPress={() => Alert.alert('Info', 'Help section coming soon')}
          />
          <SettingItem
            icon="mail-outline"
            title="Contact Support"
            subtitle="Get in touch with our team"
            onPress={() => Alert.alert('Info', 'Contact support coming soon')}
          />
          <SettingItem
            icon="information-circle-outline"
            title="About"
            subtitle="App version and information"
            onPress={() => Alert.alert('About', 'StockEase Mobile v1.0.0')}
          />
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  exportButton: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    padding: 10,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    padding: 16,
    paddingBottom: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileRole: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    marginLeft: 8,
  },
});

export default SettingsScreen;