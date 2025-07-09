import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Plus, Trash2, FileText, Mail, Send, Pencil, Search, ClipboardList, Download, CreditCard, Wallet, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  Timestamp, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  updateDoc,
  getDoc,
  runTransaction,
  limit,
  getDocs
} from "firebase/firestore";
import { InventoryItem, formatToRupees } from "@/types/inventory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { generateInvoicePDF, sendInvoiceToWhatsApp, sendInvoiceByEmail } from "@/services/invoiceService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Transaction {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod?: string; // Add payment method to transaction data
  timestamp: Date;
  total: number;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
}

const Sales = () => {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [discount, setDiscount] = useState("0");
  const [vatRate, setVatRate] = useState("18"); // GST in India is commonly 18%
  const [isProcessing, setIsProcessing] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const transactionsPerPage = 10;
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState("");
  
  // Edit transaction states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string>("");
  
  // Fetch inventory items for the dropdown
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
    }, (error) => {
      console.error("Error fetching inventory items:", error);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Fetch all transactions
  useEffect(() => {
    const q = query(
      collection(db, "sales"),
      orderBy("timestamp", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const salesData: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        salesData.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          customerName: data.customerName || "Walk-in Customer",
          customerPhone: data.customerPhone || "",
          customerEmail: data.customerEmail || ""
        } as Transaction);
      });
      
      setAllTransactions(salesData);
      setTotalPages(Math.max(1, Math.ceil(salesData.length / transactionsPerPage)));
    });
    
    return () => unsubscribe();
  }, []);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  // UPI ID for online payments
  const upiId = "megharajdandgavhal2004@okicici";

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
    setSelectedItem("");
    setNewItemQuantity("1");
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

  // Start editing transaction
  const startEditTransaction = (transaction: Transaction) => {
    setIsEditMode(true);
    setEditingTransaction(transaction);
    setEditingTransactionId(transaction.id);
    
    // Populate form with transaction data
    setCustomerName(transaction.customerName);
    setCustomerPhone(transaction.customerPhone || "");
    setCustomerEmail(transaction.customerEmail || "");
    setDiscount(transaction.discount.toString());
    setVatRate(transaction.vatRate.toString());
    
    // Set payment method if available, otherwise default to cash
    setPaymentMethod(transaction.paymentMethod || "cash");
    
    // Map transaction items to sale items
    const saleItems: SaleItem[] = transaction.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));
    
    setItems(saleItems);
    
    // Scroll to the top of the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditingTransaction(null);
    setEditingTransactionId("");
    
    // Reset form
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setDiscount("0");
    setVatRate("18");
    setPaymentMethod("cash");
  };

  // Save edited transaction
  const saveEditedTransaction = async () => {
    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items before saving the transaction.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const updatedSubtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      const updatedDiscountAmount = (updatedSubtotal * parseFloat(discount || "0")) / 100;
      const afterDiscount = updatedSubtotal - updatedDiscountAmount;
      
      const updatedVatAmount = (afterDiscount * parseFloat(vatRate || "0")) / 100;
      const updatedTotal = afterDiscount + updatedVatAmount;
      
      // Update the transaction in Firestore
      const transactionRef = doc(db, "sales", editingTransactionId);
      
      const updatedTransactionData = {
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || "",
        customerEmail: customerEmail || "",
        paymentMethod: paymentMethod, // Include payment method in updated data
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        subtotal: updatedSubtotal,
        discount: parseFloat(discount || "0"),
        discountAmount: updatedDiscountAmount,
        vatRate: parseFloat(vatRate || "0"),
        vatAmount: updatedVatAmount,
        total: updatedTotal,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(transactionRef, updatedTransactionData);
      
      toast({
        title: "Transaction Updated",
        description: "The transaction has been successfully updated.",
      });
      
      // Exit edit mode
      cancelEdit();
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update the transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  const discountAmount = (subtotal * parseFloat(discount || "0")) / 100;
  const afterDiscount = subtotal - discountAmount;
  
  const vatAmount = (afterDiscount * parseFloat(vatRate || "0")) / 100;
  const total = afterDiscount + vatAmount;

  // Handle PDF generation
  const handleGenerateInvoice = (saleData: any) => {
    try {
      const success = generateInvoicePDF(saleData);
      
      if (success) {
        toast({
          title: "Invoice Generated",
          description: "The invoice PDF has been successfully generated and downloaded.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate invoice PDF. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle WhatsApp message sending
  const handleSendWhatsApp = (saleData: any) => {
    try {
      const success = sendInvoiceToWhatsApp(saleData);
      
      if (success) {
        toast({
          title: "WhatsApp Message Prepared",
          description: "WhatsApp will open with the invoice details.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to prepare WhatsApp message. Please check the phone number.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      toast({
        title: "Error",
        description: "Failed to send WhatsApp message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle Email sending
  const handleSendEmail = (saleData: any) => {
    try {
      const success = sendInvoiceByEmail(saleData);
      
      if (success) {
        toast({
          title: "Email Prepared",
          description: "Your email client will open with the invoice details.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to prepare email. Please check the email address.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const processSale = async () => {
    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items to the cart before completing the sale.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      // Variables to store sale data for PDF generation
      let saleId = '';
      const currentTimestamp = new Date();
      
      // Start a transaction to ensure both sale creation and inventory update succeed or fail together
      await runTransaction(db, async (transaction) => {
        // First check if we have enough inventory for each item
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
        
        // Create the sale document with customer contact info and payment method
        const saleData = {
          customerName: customerName || "Walk-in Customer",
          customerPhone: customerPhone || "",
          customerEmail: customerEmail || "",
          paymentMethod: paymentMethod, // Add payment method to transaction data
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
          createdBy: "user_id", // This would be replaced by the actual user ID
        };
        
        // Add the sale document
        const saleRef = doc(collection(db, "sales"));
        saleId = saleRef.id; // Store the ID for later use
        transaction.set(saleRef, saleData);
        
        // Update inventory quantities for each item
        items.forEach((item, index) => {
          const { ref, currentQuantity } = inventoryChecks[index];
          const newQuantity = currentQuantity - item.quantity;
          
          transaction.update(ref, { 
            quantity: newQuantity,
            updatedAt: serverTimestamp()
          });
        });
      });

      // Prepare sale data for PDF generation (after the transaction)
      const saleData = {
        id: saleId,
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || "",
        customerEmail: customerEmail || "",
        paymentMethod: paymentMethod, // Include payment method in PDF data
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
        timestamp: currentTimestamp,
      };
      
      // Generate PDF invoice and send to WhatsApp if phone number is provided
      handleGenerateInvoice(saleData);
      
      if (customerPhone) {
        handleSendWhatsApp(saleData);
      }
      
      if (customerEmail) {
        handleSendEmail(saleData);
      }
      
      toast({
        title: "Sale Complete",
        description: `Sale of ${formatToRupees(total)} has been processed successfully and inventory has been updated.`,
      });
      
      // Reset form including payment method
      setItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDiscount("0");
      setPaymentMethod("cash");
    } catch (error: any) {
      console.error("Error processing sale:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter transactions based on customer search
  const filteredTransactions = allTransactions.filter(transaction => 
    transaction.customerName.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Get current page transactions
  const currentTransactions = filteredTransactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  );
  
  // Helper function to generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pageNumbers.push(i);
        }
      }
    }
    
    return pageNumbers;
  };

  // Function to export transaction data
  const handleExportTransactionData = () => {
    try {
      // Create workbook and worksheet
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();
      
      // Convert transactions to worksheet format
      const worksheetData = allTransactions.map(transaction => ({
        'Transaction ID': transaction.id,
        'Date': transaction.timestamp.toLocaleDateString(),
        'Customer': transaction.customerName,
        'Items': transaction.items.length,
        'Total': transaction.total,
        'Phone': transaction.customerPhone || 'N/A',
        'Email': transaction.customerEmail || 'N/A'
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'All Transactions');
      
      // Write to file and trigger download
      XLSX.writeFile(workbook, 'all_transactions.xlsx');
      
      toast({
        title: "All Transactions Downloaded",
        description: "Transaction data has been downloaded as Excel file",
      });
      
      return true;
    } catch (error) {
      console.error("Error exporting transactions:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error generating the transactions report",
      });
      return false;
    }
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);

  // Handle edit transaction
  const handleEditTransaction = (transaction) => {
    setCurrentTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  // Handle save transaction
  const handleSaveTransaction = () => {
    if (!currentTransaction) return;
    
    // Convert items to the correct format
    const updatedItems = currentTransaction.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity
    }));

    const updatedTransaction = {
      ...currentTransaction,
      items: updatedItems,
    };

    const success = updateTransaction(updatedTransaction);
    if (success) {
      toast({
        title: "Transaction Updated",
        description: "The transaction has been successfully updated",
      });
      setIsEditDialogOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "There was an error updating the transaction",
      });
    }
  };

  const updateTransaction = async (transaction) => {
    try {
      const transactionRef = doc(db, "sales", transaction.id);
      
      // Prepare the data to be updated
      const updatedData = {
        customerName: transaction.customerName,
        customerPhone: transaction.customerPhone,
        customerEmail: transaction.customerEmail,
        items: transaction.items,
        subtotal: transaction.subtotal,
        discount: transaction.discount,
        discountAmount: transaction.discountAmount,
        vatRate: transaction.vatRate,
        vatAmount: transaction.vatAmount,
        total: transaction.total,
        updatedAt: serverTimestamp(),
      };
  
      // Update the document
      await updateDoc(transactionRef, updatedData);
  
      toast({
        title: "Transaction Updated",
        description: "The transaction has been successfully updated.",
      });
  
      return true;
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: "Failed to update the transaction. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? "Edit Transaction" : "New Sale"}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode 
              ? "Update an existing sales transaction" 
              : "Process a new sales transaction"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cart Items</CardTitle>
                <CardDescription>
                  {isEditMode ? "Edit items in this transaction" : "Add items to the current sale"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Select
                      value={selectedItem}
                      onValueChange={setSelectedItem}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - {formatToRupees(item.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Qty"
                    type="number"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    className="w-20"
                  />
                  <Button onClick={addItem} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="border rounded-md">
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No items added yet
                    </div>
                  ) : (
                    <div className="divide-y">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatToRupees(item.price)} each
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center border rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    Math.max(1, item.quantity - 1)
                                  )
                                }
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                              >
                                +
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* All Transactions section below cart */}
            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100/50">
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>
                  Complete list of all sales transactions
                </CardDescription>
                <div className="mt-4 relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by customer name..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white dark:bg-gray-900">
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTransactions.length > 0 ? (
                        currentTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">
                              #{transaction.id}
                            </TableCell>
                            <TableCell>{transaction.timestamp.toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium text-blue-600">
                              {transaction.customerName}
                            </TableCell>
                            <TableCell>{transaction.items.length}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatToRupees(transaction.total)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex space-x-1 justify-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleGenerateInvoice(transaction)}
                                  title="Download Invoice"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                {transaction.customerPhone && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleSendWhatsApp(transaction)}
                                    title="Send to WhatsApp"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                                {transaction.customerEmail && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleSendEmail(transaction)}
                                    title="Send Email"
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => startEditTransaction(transaction)}
                                  title="Edit Transaction"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-end px-4 py-4">
                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        
                        {getPageNumbers().map(page => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={currentPage === page}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isEditMode ? "Edit Transaction Details" : "Sale Details"}</CardTitle>
                <CardDescription>
                  Customer information and payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Details */}
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer Name</Label>
                  <Input
                    id="customer"
                    placeholder="Walk-in Customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="Customer Phone Number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">For WhatsApp invoice delivery</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Customer Email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">For email invoice delivery</p>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3 pt-2">
                  <Label>Payment Method</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center">
                        <Wallet className="mr-2 h-4 w-4" />
                        Cash
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online" className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Online
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Online Payment QR Code Display */}
                {paymentMethod === "online" && (
                  <div className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex flex-col items-center">
                      <img 
                        src="/lovable-uploads/6e46d40b-d83d-4d46-bc29-df6b1f071c18.png" 
                        alt="UPI QR Code" 
                        className="w-64 h-64 object-contain mb-4" 
                      />
                      <div className="flex items-center mb-1 text-sm font-medium">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        <span>UPI ID: {upiId}</span>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Scan to pay with any UPI app
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vat">GST Rate (%)</Label>
                  <Input
                    id="vat"
                    type="number"
                    min="0"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                  />
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatToRupees(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount ({discount}%):</span>
                    <span>-{formatToRupees(discountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST ({vatRate}%):</span>
                    <span>{formatToRupees(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatToRupees(total)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className={isEditMode ? "flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4" : ""}>
                {isEditMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      className="w-full sm:w-auto"
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveEditedTransaction}
                      className="w-full sm:w-auto"
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={processSale}
                    className="w-full"
                    disabled={isProcessing || items.length === 0}
                  >
                    {isProcessing ? (
                      "Processing..."
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" /> Complete Sale
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Sales;
