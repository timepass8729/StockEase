import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { formatToRupees } from '../types/inventory';
import { PieChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

const DashboardScreen = () => {
  const { userData } = useAuth();
  const [inventoryCount, setInventoryCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [growth, setGrowth] = useState(0);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get current date and previous month date
    const currentDate = new Date();
    const previousMonthDate = new Date();
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const previousMonthStart = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), 1);
    
    // Get current month sales for revenue calculation
    const unsubSales = onSnapshot(
      query(
        collection(db, "sales"),
        where("timestamp", ">=", Timestamp.fromDate(currentMonthStart))
      ),
      (snapshot) => {
        let revenue = 0;
        let count = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          revenue += data.total || 0;
          count++;
        });
        
        setTotalRevenue(revenue);
        setSalesCount(count);
      }
    );
    
    // Get inventory count
    const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => {
      setInventoryCount(snapshot.size);
    });
    
    // Get payment method distribution
    const unsubPaymentMethods = onSnapshot(
      query(collection(db, "sales")),
      (snapshot) => {
        const paymentMethodCounts: {[key: string]: number} = {
          "Cash": 0,
          "Online": 0
        };
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          let paymentMethod = data.paymentMethod || "Cash";
          
          if (paymentMethod.toLowerCase() === "cash") {
            paymentMethod = "Cash";
          } else if (paymentMethod.toLowerCase() === "online") {
            paymentMethod = "Online";
          }
          
          paymentMethodCounts[paymentMethod] = (paymentMethodCounts[paymentMethod] || 0) + 1;
        });
        
        const paymentMethodArray = Object.keys(paymentMethodCounts).map(method => ({
          name: method,
          population: paymentMethodCounts[method],
          color: method === 'Cash' ? '#00C49F' : '#0088FE',
          legendFontColor: '#7F7F7F',
          legendFontSize: 15,
        }));
        
        setPaymentMethodData(paymentMethodArray);
        setIsLoading(false);
      }
    );
    
    return () => {
      unsubSales();
      unsubInventory();
      unsubPaymentMethods();
    };
  }, []);

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardContent}>
        <View style={styles.statCardLeft}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              <Text style={styles.userRole}>
                {userData?.role === 'admin' ? 'Administrator' : 'Employee'}
              </Text>
            </View>
            <View style={styles.logoContainer}>
              <Ionicons name="cube" size={32} color="#0284c7" />
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <StatCard
              title="Total Revenue"
              value={formatToRupees(totalRevenue)}
              icon="cash-outline"
              color="#10b981"
              subtitle={`${growth > 0 ? '+' : ''}${growth}% from last month`}
            />
            <StatCard
              title="Sales"
              value={`+${salesCount}`}
              icon="cart-outline"
              color="#3b82f6"
              subtitle="This month"
            />
            <StatCard
              title="Inventory Items"
              value={inventoryCount}
              icon="cube-outline"
              color="#8b5cf6"
              subtitle="Total items in stock"
            />
            <StatCard
              title="Growth"
              value={`${growth > 0 ? '+' : ''}${growth}%`}
              icon="trending-up-outline"
              color="#f59e0b"
              subtitle="Compared to last month"
            />
          </View>

          {/* Payment Methods Chart */}
          {paymentMethodData.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Payment Methods</Text>
              <PieChart
                data={paymentMethodData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickActionCard}>
                <Ionicons name="add-circle-outline" size={32} color="#0284c7" />
                <Text style={styles.quickActionText}>Add Item</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard}>
                <Ionicons name="cart-outline" size={32} color="#0284c7" />
                <Text style={styles.quickActionText}>New Sale</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard}>
                <Ionicons name="bar-chart-outline" size={32} color="#0284c7" />
                <Text style={styles.quickActionText}>Reports</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard}>
                <Ionicons name="alert-circle-outline" size={32} color="#0284c7" />
                <Text style={styles.quickActionText}>Alerts</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userRole: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  logoContainer: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLeft: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;