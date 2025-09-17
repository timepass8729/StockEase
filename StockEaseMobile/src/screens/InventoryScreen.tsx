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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc,
  doc,
  Timestamp, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { InventoryItem, formatToRupees } from '../types/inventory';
import { Picker } from '@react-native-picker/picker';

const InventoryScreen = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  
  // Form states
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    costPrice: '',
    quantity: '',
    reorderLevel: '5',
    description: '',
  });

  const categories = ["Electronics", "Clothing", "Food", "Books", "Other"];

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q, 
      (querySnapshot) => {
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
        
        setItems(fetchedItems);
        setIsLoading(false);
      }, 
      (error) => {
        console.error("Error fetching inventory:", error);
        Alert.alert('Error', 'Failed to load inventory items.');
        setIsLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, []);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.sku || !newItem.category || !newItem.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const currentTime = Timestamp.now();
      
      await addDoc(collection(db, "inventory"), {
        name: newItem.name,
        sku: newItem.sku,
        category: newItem.category,
        price: parseFloat(newItem.price),
        costPrice: parseFloat(newItem.costPrice) || 0,
        quantity: parseInt(newItem.quantity) || 0,
        reorderLevel: parseInt(newItem.reorderLevel) || 5,
        description: newItem.description,
        createdAt: currentTime,
        updatedAt: currentTime,
      });
      
      setNewItem({
        name: '',
        sku: '',
        category: '',
        price: '',
        costPrice: '',
        quantity: '',
        reorderLevel: '5',
        description: '',
      });
      
      setModalVisible(false);
      Alert.alert('Success', 'Item added successfully!');
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert('Error', 'Failed to add inventory item.');
    }
  };

  const handleEditItem = async () => {
    if (!editItem) return;

    try {
      const itemRef = doc(db, "inventory", editItem.id);
      const currentTime = Timestamp.now();
      
      await updateDoc(itemRef, {
        name: editItem.name,
        sku: editItem.sku,
        category: editItem.category,
        price: editItem.price,
        costPrice: editItem.costPrice,
        quantity: editItem.quantity,
        reorderLevel: editItem.reorderLevel,
        description: editItem.description,
        updatedAt: currentTime,
      });
      
      setEditModalVisible(false);
      Alert.alert('Success', 'Item updated successfully!');
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert('Error', 'Failed to update inventory item.');
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => {
        setEditItem(item);
        setEditModalVisible(true);
      }}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>{formatToRupees(item.price)}</Text>
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.itemSku}>SKU: {item.sku}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      <View style={styles.itemFooter}>
        <Text style={[
          styles.itemQuantity,
          item.quantity <= item.reorderLevel && styles.lowStock
        ]}>
          Stock: {item.quantity}
        </Text>
        <Text style={styles.itemValue}>
          Value: {formatToRupees(item.price * item.quantity)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#666"
        />
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Item Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Item Name"
              value={newItem.name}
              onChangeText={(text) => setNewItem({...newItem, name: text})}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="SKU"
              value={newItem.sku}
              onChangeText={(text) => setNewItem({...newItem, sku: text})}
            />
            
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newItem.category}
                onValueChange={(value) => setNewItem({...newItem, category: value})}
                style={styles.picker}
              >
                <Picker.Item label="Select Category" value="" />
                {categories.map((category) => (
                  <Picker.Item key={category} label={category} value={category} />
                ))}
              </Picker>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Price (₹)"
              value={newItem.price}
              onChangeText={(text) => setNewItem({...newItem, price: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Cost Price (₹)"
              value={newItem.costPrice}
              onChangeText={(text) => setNewItem({...newItem, costPrice: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Quantity"
              value={newItem.quantity}
              onChangeText={(text) => setNewItem({...newItem, quantity: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Reorder Level"
              value={newItem.reorderLevel}
              onChangeText={(text) => setNewItem({...newItem, reorderLevel: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Description"
              value={newItem.description}
              onChangeText={(text) => setNewItem({...newItem, description: text})}
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity style={styles.saveButton} onPress={handleAddItem}>
              <Text style={styles.saveButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {editItem && (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Item Name"
                  value={editItem.name}
                  onChangeText={(text) => setEditItem({...editItem, name: text})}
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="SKU"
                  value={editItem.sku}
                  onChangeText={(text) => setEditItem({...editItem, sku: text})}
                />
                
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editItem.category}
                    onValueChange={(value) => setEditItem({...editItem, category: value})}
                    style={styles.picker}
                  >
                    {categories.map((category) => (
                      <Picker.Item key={category} label={category} value={category} />
                    ))}
                  </Picker>
                </View>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Price (₹)"
                  value={editItem.price.toString()}
                  onChangeText={(text) => setEditItem({...editItem, price: parseFloat(text) || 0})}
                  keyboardType="numeric"
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Cost Price (₹)"
                  value={editItem.costPrice.toString()}
                  onChangeText={(text) => setEditItem({...editItem, costPrice: parseFloat(text) || 0})}
                  keyboardType="numeric"
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Quantity"
                  value={editItem.quantity.toString()}
                  onChangeText={(text) => setEditItem({...editItem, quantity: parseInt(text) || 0})}
                  keyboardType="numeric"
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Reorder Level"
                  value={editItem.reorderLevel.toString()}
                  onChangeText={(text) => setEditItem({...editItem, reorderLevel: parseInt(text) || 0})}
                  keyboardType="numeric"
                />
                
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Description"
                  value={editItem.description}
                  onChangeText={(text) => setEditItem({...editItem, description: text})}
                  multiline
                  numberOfLines={3}
                />
                
                <TouchableOpacity style={styles.saveButton} onPress={handleEditItem}>
                  <Text style={styles.saveButtonText}>Update Item</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#0284c7',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
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
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  itemHeader: {
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
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284c7',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  lowStock: {
    color: '#ef4444',
  },
  itemValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#f9fafb',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InventoryScreen;