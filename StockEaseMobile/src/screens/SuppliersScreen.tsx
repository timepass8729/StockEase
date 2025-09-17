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
import { Picker } from '@react-native-picker/picker';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const SuppliersScreen = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const suppliersCollection = collection(db, "suppliers");
    const q = query(suppliersCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const suppliersData: Supplier[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            contactName: data.contactName || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            description: data.description || '',
            status: data.status || 'active',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        });
        setSuppliers(suppliersData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching suppliers:", error);
        Alert.alert('Error', 'Failed to load suppliers data.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      description: '',
      status: 'active',
    });
  };

  const addSupplier = async () => {
    if (!formData.name || !formData.contactName || !formData.email || !formData.phone) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      await addDoc(collection(db, "suppliers"), {
        ...formData,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      });
      
      Alert.alert('Success', 'Supplier added successfully.');
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error("Error adding supplier:", error);
      Alert.alert('Error', 'Failed to add supplier.');
    }
  };

  const updateSupplier = async () => {
    if (!editSupplier) return;

    try {
      const supplierDocRef = doc(db, "suppliers", editSupplier.id);
      
      await updateDoc(supplierDocRef, {
        ...formData,
        updatedAt: Timestamp.fromDate(new Date()),
      });
      
      Alert.alert('Success', 'Supplier updated successfully.');
      setEditModalVisible(false);
      resetForm();
    } catch (error) {
      console.error("Error updating supplier:", error);
      Alert.alert('Error', 'Failed to update supplier.');
    }
  };

  const deleteSupplier = async (supplierId: string) => {
    Alert.alert(
      'Delete Supplier',
      'Are you sure you want to delete this supplier?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "suppliers", supplierId));
              Alert.alert('Success', 'Supplier deleted successfully.');
            } catch (error) {
              console.error("Error deleting supplier:", error);
              Alert.alert('Error', 'Failed to delete supplier.');
            }
          },
        },
      ]
    );
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <View style={styles.supplierCard}>
      <View style={styles.supplierHeader}>
        <Text style={styles.supplierName}>{item.name}</Text>
        <View style={[
          styles.statusBadge,
          item.status === 'active' ? styles.activeBadge : styles.inactiveBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'active' ? styles.activeText : styles.inactiveText
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <Text style={styles.contactName}>Contact: {item.contactName}</Text>
      <Text style={styles.contactInfo}>📧 {item.email}</Text>
      <Text style={styles.contactInfo}>📞 {item.phone}</Text>
      
      <View style={styles.supplierActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditSupplier(item);
            setFormData({
              name: item.name,
              contactName: item.contactName,
              email: item.email,
              phone: item.phone,
              address: item.address,
              description: item.description,
              status: item.status,
            });
            setEditModalVisible(true);
          }}
        >
          <Ionicons name="pencil-outline" size={16} color="#0284c7" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteSupplier(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const SupplierForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
        </Text>
        <TouchableOpacity onPress={() => {
          isEdit ? setEditModalVisible(false) : setModalVisible(false);
          resetForm();
        }}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <TextInput
        style={styles.modalInput}
        placeholder="Supplier Name *"
        value={formData.name}
        onChangeText={(text) => setFormData({...formData, name: text})}
      />
      
      <TextInput
        style={styles.modalInput}
        placeholder="Contact Person *"
        value={formData.contactName}
        onChangeText={(text) => setFormData({...formData, contactName: text})}
      />
      
      <TextInput
        style={styles.modalInput}
        placeholder="Email Address *"
        value={formData.email}
        onChangeText={(text) => setFormData({...formData, email: text})}
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.modalInput}
        placeholder="Phone Number *"
        value={formData.phone}
        onChangeText={(text) => setFormData({...formData, phone: text})}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={[styles.modalInput, styles.textArea]}
        placeholder="Address"
        value={formData.address}
        onChangeText={(text) => setFormData({...formData, address: text})}
        multiline
        numberOfLines={3}
      />
      
      <TextInput
        style={[styles.modalInput, styles.textArea]}
        placeholder="Description"
        value={formData.description}
        onChangeText={(text) => setFormData({...formData, description: text})}
        multiline
        numberOfLines={3}
      />
      
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Status</Text>
        <Picker
          selectedValue={formData.status}
          onValueChange={(value) => setFormData({...formData, status: value})}
          style={styles.picker}
        >
          <Picker.Item label="Active" value="active" />
          <Picker.Item label="Inactive" value="inactive" />
        </Picker>
      </View>
      
      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={isEdit ? updateSupplier : addSupplier}
      >
        <Text style={styles.saveButtonText}>
          {isEdit ? 'Update Supplier' : 'Add Supplier'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suppliers</Text>
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
          placeholder="Search suppliers..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#666"
        />
      </View>

      <FlatList
        data={filteredSuppliers}
        renderItem={renderSupplier}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Supplier Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SupplierForm />
        </View>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SupplierForm isEdit={true} />
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
  supplierCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activeText: {
    color: '#16a34a',
  },
  inactiveText: {
    color: '#dc2626',
  },
  contactName: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  supplierActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 8,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 8,
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
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
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

export default SuppliersScreen;