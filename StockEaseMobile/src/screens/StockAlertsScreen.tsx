import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { InventoryItem, formatToRupees } from '../types/inventory';

const StockAlertsScreen = () => {
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const items: InventoryItem[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const item = {
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            quantity: data.quantity || 0,
            imageUrl: data.imageUrl || '',
            sku: data.sku || '',
            category: data.category || 'Uncategorized',
            costPrice: data.costPrice || 0,
            reorderLevel: data.reorderLevel || 10,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as InventoryItem;
          
          items.push(item);
        });
        
        setAllItems(items);
        setIsLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error fetching inventory:", error);
        setIsLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
  };

  // Filter items for alerts (out of stock or low stock)
  const alertItems = allItems.filter(item => {
    const isOutOfStock = item.quantity === 0;
    const isLowStock = item.quantity > 0 && item.quantity <= item.reorderLevel;
    return isOutOfStock || isLowStock;
  });

  const outOfStockItems = alertItems.filter(item => item.quantity === 0);
  const lowStockItems = alertItems.filter(item => item.quantity > 0 && item.quantity <= item.reorderLevel);
  
  const filteredAlerts = alertItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAlertType = (item: InventoryItem) => {
    if (item.quantity === 0) return 'critical';
    if (item.quantity <= Math.ceil(item.reorderLevel * 0.5)) return 'high';
    if (item.quantity <= item.reorderLevel) return 'medium';
    return 'low';
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getAlertText = (item: InventoryItem) => {
    if (item.quantity === 0) return 'Out of Stock';
    return 'Low Stock';
  };

  const renderAlertItem = ({ item }: { item: InventoryItem }) => {
    const alertType = getAlertType(item);
    const alertColor = getAlertColor(alertType);
    const stockValue = item.quantity * item.price;

    return (
      <View style={[styles.alertCard, { borderLeftColor: alertColor }]}>
        <View style={styles.alertHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[styles.alertBadge, { backgroundColor: alertColor + '20' }]}>
            <Text style={[styles.alertBadgeText, { color: alertColor }]}>
              {getAlertText(item)}
            </Text>
          </View>
        </View>
        
        <View style={styles.alertDetails}>
          <Text style={styles.itemSku}>SKU: {item.sku}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
        </View>
        
        <View style={styles.stockInfo}>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Current Stock:</Text>
            <Text style={[
              styles.stockValue,
              item.quantity === 0 ? styles.criticalStock : styles.lowStock
            ]}>
              {item.quantity}
            </Text>
          </View>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Reorder Level:</Text>
            <Text style={styles.stockValue}>{item.reorderLevel}</Text>
          </View>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Unit Price:</Text>
            <Text style={styles.stockValue}>{formatToRupees(item.price)}</Text>
          </View>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Stock Value:</Text>
            <Text style={styles.stockValue}>{formatToRupees(stockValue)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock Alerts</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Alert Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="alert-circle" size={24} color="#ef4444" />
          <Text style={styles.summaryNumber}>{outOfStockItems.length}</Text>
          <Text style={styles.summaryLabel}>Out of Stock</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="warning" size={24} color="#f59e0b" />
          <Text style={styles.summaryNumber}>{lowStockItems.length}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="list" size={24} color="#3b82f6" />
          <Text style={styles.summaryNumber}>{alertItems.length}</Text>
          <Text style={styles.summaryLabel}>Total Alerts</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search alerts..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#666"
        />
      </View>

      <FlatList
        data={filteredAlerts}
        renderItem={renderAlertItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            <Text style={styles.emptyTitle}>No Stock Alerts</Text>
            <Text style={styles.emptySubtitle}>All items are adequately stocked</Text>
          </View>
        }
      />
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
  refreshButton: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    padding: 10,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemSku: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemCategory: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockInfo: {
    gap: 4,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  criticalStock: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  lowStock: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StockAlertsScreen;