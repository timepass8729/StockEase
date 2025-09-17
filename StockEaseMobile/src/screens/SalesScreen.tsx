import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  Timestamp, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  runTransaction
} from 'firebase/firestore';
import { InventoryItem, formatToRupees } from '../types/inventory';
import QRCode from 'react-native-qrcode-svg';

interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const SalesScreen = () => {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [discount, setDiscount] = useState('0');
  const [vatRate, setVatRate] = useState('18');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const upiId = "megharajdandgavhal2004@okicici";

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("name"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedItems: InventoryItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedItems.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as InventoryItem);
      });
      
      setInventoryItems(fetchedItems);
    });
    
    return () => unsubscribe();
  }, []);

  const addItem = () => {
    if (!selectedItem) return;
    
    const inventoryItem = inventoryItems.find(item => item.id === selectedItem);
    if (!inventoryItem) return;
    
    const quantity = parseInt(newItemQuantity) || 1;
    
    const newItem = {
      id: inventoryItem.id,
      name: inventoryItem.name,
      price: inventoryItem.price,
      quantity: quantity,
    };
    
    setItems([...items, newItem]);
    setSelectedItem('');
    setNewItemQuantity('1');
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, quantity: quantity } : item
      )
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  const discountAmount = (subtotal * parseFloat(discount || "0")) / 100;
  const afterDiscount = subtotal - discountAmount;
  
  const vatAmount = (afterDiscount * parseFloat(vatRate || "0")) / 100;
  const total = afterDiscount + vatAmount;

  const processSale = async () => {
    if (items.length === 0) {
      Alert.alert('Error', 'Please add items to the cart before completing the sale.');
      return;
    }
    
    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        // Check inventory and update quantities
        const inventoryChecks = await Promise.all(
          items.map(async (item) => {
            const inventoryRef = doc(db, "inventory", item.id);
            const inventoryDoc = await transaction.get(inventoryRef);
            
            if (!inventoryDoc.exists()) {
              throw new Error(`Product ${item.name} no longer exists in inventory`);
            }
            
            const currentQuantity = inventoryDoc.data().quantity;
            if (currentQuantity < item.quantity) {
              throw new Error(`Not enough ${item.name} in stock. Only ${currentQuantity} available.`);
            }
            
            return { ref: inventoryRef, currentQuantity };
          })
        );
        
        // Create the sale document
        const saleData = {
          customerName: customerName || "Walk-in Customer",
          customerPhone: customerPhone || "",
          customerEmail: customerEmail || "",
          paymentMethod: paymentMethod,
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity
          })),
          subtotal,
          discount: parseFloat(discount || "0"),
          discountAmount,
          vatRate: parseFloat(vatRate || "0"),
          vatAmount,
          total,
          timestamp: serverTimestamp(),
        };
        
        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, saleData);
        
        // Update inventory quantities
        items.forEach((item, index) => {
          const { ref, currentQuantity } = inventoryChecks[index];
          const newQuantity = currentQuantity - item.quantity;
          
          transaction.update(ref, { 
            quantity: newQuantity,
            updatedAt: serverTimestamp()
          });
        });
      });
      
      Alert.alert('Success', `Sale of ${formatToRupees(total)} has been processed successfully!`);
      
      // Reset form
      setItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setDiscount('0');
      setPaymentMethod('cash');
      setShowQR(false);
    } catch (error: any) {
      console.error("Error processing sale:", error);
      Alert.alert('Error', error.message || 'Failed to process sale. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCartItem = ({ item }: { item: SaleItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>{formatToRupees(item.price)} each</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
        >
          <Ionicons name="remove" size={16} color="#0284c7" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={16} color="#0284c7" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Sale</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Add Item Section */}
        <View style={styles.addItemSection}>
          <Text style={styles.sectionTitle}>Add Items</Text>
          <View style={styles.addItemRow}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedItem}
                onValueChange={setSelectedItem}
                style={styles.picker}
              >
                <Picker.Item label="Select an item" value="" />
                {inventoryItems.map((item) => (
                  <Picker.Item 
                    key={item.id} 
                    label={`${item.name} - ${formatToRupees(item.price)}`} 
                    value={item.id} 
                  />
                ))}
              </Picker>
            </View>
            <TextInput
              style={styles.quantityInput}
              placeholder="Qty"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cart Items */}
        <View style={styles.cartSection}>
          <Text style={styles.sectionTitle}>Cart Items</Text>
          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyCartText}>No items added yet</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Customer Details */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Customer Name"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={customerEmail}
            onChangeText={setCustomerEmail}
            keyboardType="email-address"
          />
        </View>

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethodButton,
                paymentMethod === 'cash' && styles.selectedPaymentMethod
              ]}
              onPress={() => {
                setPaymentMethod('cash');
                setShowQR(false);
              }}
            >
              <Ionicons name="wallet-outline" size={24} color={paymentMethod === 'cash' ? 'white' : '#0284c7'} />
              <Text style={[
                styles.paymentMethodText,
                paymentMethod === 'cash' && styles.selectedPaymentMethodText
              ]}>Cash</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.paymentMethodButton,
                paymentMethod === 'online' && styles.selectedPaymentMethod
              ]}
              onPress={() => {
                setPaymentMethod('online');
                setShowQR(true);
              }}
            >
              <Ionicons name="card-outline" size={24} color={paymentMethod === 'online' ? 'white' : '#0284c7'} />
              <Text style={[
                styles.paymentMethodText,
                paymentMethod === 'online' && styles.selectedPaymentMethodText
              ]}>Online</Text>
            </TouchableOpacity>
          </View>

          {/* QR Code for Online Payment */}
          {showQR && (
            <View style={styles.qrContainer}>
              <Text style={styles.qrTitle}>Scan to Pay</Text>
              <QRCode
                value={`upi://pay?pa=${upiId}&pn=StockEase&am=${total}&cu=INR`}
                size={200}
                backgroundColor="white"
                color="black"
              />
              <Text style={styles.upiId}>UPI ID: {upiId}</Text>
            </View>
          )}
        </View>

        {/* Pricing Details */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Discount (%)"
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="GST Rate (%)"
              value={vatRate}
              onChangeText={setVatRate}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatToRupees(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount ({discount}%):</Text>
              <Text style={styles.summaryValue}>-{formatToRupees(discountAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST ({vatRate}%):</Text>
              <Text style={styles.summaryValue}>{formatToRupees(vatAmount)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatToRupees(total)}</Text>
            </View>
          </View>
        </View>

        {/* Complete Sale Button */}
        <TouchableOpacity
          style={[styles.completeSaleButton, (isProcessing || items.length === 0) && styles.disabledButton]}
          onPress={processSale}
          disabled={isProcessing || items.length === 0}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="white" />
          <Text style={styles.completeSaleText}>
            {isProcessing ? 'Processing...' : 'Complete Sale'}
          </Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  addItemSection: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  picker: {
    height: 50,
  },
  quantityInput: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#f9fafb',
  },
  addItemButton: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyCart: {
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#6b7280',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  paymentSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0284c7',
    backgroundColor: 'white',
  },
  selectedPaymentMethod: {
    backgroundColor: '#0284c7',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284c7',
    marginLeft: 8,
  },
  selectedPaymentMethodText: {
    color: 'white',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  upiId: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  pricingSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  summaryContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  completeSaleButton: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  completeSaleText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SalesScreen;