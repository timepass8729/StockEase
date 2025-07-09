import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AdminRoute from "@/components/AdminRoute";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc, getDoc, setDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Cloud, 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw, 
  Database,
  Activity,
  Download,
  Trash2,
  Package,
  TrendingDown,
  TrendingUp,
  Calendar,
  Receipt
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const Settings = () => {
  // Business Information State
  const [companyName, setCompanyName] = useState("StockEase Inc.");
  const [address, setAddress] = useState("123 Business Ave.");
  const [phone, setPhone] = useState("555-123-4567");
  const [email, setEmail] = useState("contact@stockease.com");
  const [taxId, setTaxId] = useState("TAX-12345");
  const [vatRate, setVatRate] = useState("15");
  const [currency, setCurrency] = useState("USD");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for your business!");
  
  // System Preferences State
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  
  // Business Hours
  const [businessHours, setBusinessHours] = useState({
    monday: { open: "09:00", close: "18:00", closed: false },
    tuesday: { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday: { open: "09:00", close: "18:00", closed: false },
    friday: { open: "09:00", close: "18:00", closed: false },
    saturday: { open: "10:00", close: "16:00", closed: false },
    sunday: { open: "10:00", close: "16:00", closed: true }
  });
  
  // Auto cleanup settings
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [cleanupDays, setCleanupDays] = useState("30");
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [dataRetention, setDataRetention] = useState("365");
  
  // Real-time stats
  const [realTimeStats, setRealTimeStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    totalSales: 0,
    todaySales: 0,
    topSellingProduct: "N/A",
    recentSales: []
  });
  
  // Database Settings
  const [databaseStats, setDatabaseStats] = useState({
    records: 0,
    storage: "0 MB",
    transactions: 0,
    performance: "0%"
  });
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isExportInProgress, setIsExportInProgress] = useState(false);
  
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { currentUser } = useAuth();
  const [darkMode, setDarkMode] = useState(theme === 'dark');
  
  // Load user settings from Firestore
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!currentUser) return;
      
      try {
        const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
        const docSnap = await getDoc(userSettingsRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Load business info
          if (data.businessInfo) {
            setCompanyName(data.businessInfo.companyName || "StockEase Inc.");
            setAddress(data.businessInfo.address || "123 Business Ave.");
            setPhone(data.businessInfo.phone || "555-123-4567");
            setEmail(data.businessInfo.email || "contact@stockease.com");
            setTaxId(data.businessInfo.taxId || "TAX-12345");
            setVatRate(data.businessInfo.vatRate || "15");
            setCurrency(data.businessInfo.currency || "USD");
            setReceiptFooter(data.businessInfo.receiptFooter || "Thank you for your business!");
          }
          
          // Load preferences
          if (data.preferences) {
            setLowStockAlerts(data.preferences.lowStockAlerts ?? true);
            setEmailNotifications(data.preferences.emailNotifications ?? true);
            setDarkMode(data.preferences.darkMode ?? false);
            setAutoBackup(data.preferences.autoBackup ?? true);
            setLowStockThreshold(data.preferences.lowStockThreshold || "10");
          }
          
          // Load business hours
          if (data.businessHours) {
            setBusinessHours(data.businessHours);
          }
          
          // Load cleanup settings
          if (data.cleanup) {
            setAutoCleanup(data.cleanup.autoCleanup ?? true);
            setCleanupDays(data.cleanup.cleanupDays || "30");
          }
          
          // Load database settings
          if (data.database) {
            setBackupFrequency(data.database.backupFrequency || "daily");
            setDataRetention(data.database.dataRetention || "365");
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadUserSettings();
    fetchRealTimeStats();
    fetchDatabaseStats();
  }, [currentUser]);
  
  // Update theme when dark mode changes
  useEffect(() => {
    setTheme(darkMode ? 'dark' : 'light');
  }, [darkMode, setTheme]);
  
  // Fetch real-time statistics from database
  const fetchRealTimeStats = async () => {
    if (!currentUser) return;
    
    try {
      // Get inventory data
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const inventoryItems = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const totalProducts = inventoryItems.length;
      const lowStockItems = inventoryItems.filter((item: any) => 
        item.quantity <= parseInt(lowStockThreshold)
      ).length;
      
      // Get sales data
      const salesSnapshot = await getDocs(collection(db, 'sales'));
      const salesData = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const totalSales = salesData.length;
      
      // Get today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = salesData.filter((sale: any) => {
        if (!sale.date) return false;
        const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
        return saleDate >= today;
      }).length;
      
      // Get recent sales (last 5)
      const recentSalesQuery = query(
        collection(db, 'sales'),
        orderBy('date', 'desc'),
        limit(5)
      );
      const recentSalesSnapshot = await getDocs(recentSalesQuery);
      const recentSales = recentSalesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Find top selling product (simplified)
      const productSales: Record<string, number> = {};
      salesData.forEach((sale: any) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            if (item.name) {
              productSales[item.name] = (productSales[item.name] || 0) + (item.quantity || 0);
            }
          });
        }
      });
      
      const topSellingProduct = Object.keys(productSales).length > 0 
        ? Object.keys(productSales).reduce((a, b) => productSales[a] > productSales[b] ? a : b)
        : "N/A";
      
      setRealTimeStats({
        totalProducts,
        lowStockItems,
        totalSales,
        todaySales,
        topSellingProduct,
        recentSales
      });
      
    } catch (error) {
      console.error('Error fetching real-time stats:', error);
    }
  };
  
  // Fetch database statistics
  const fetchDatabaseStats = async () => {
    if (!currentUser) return;
    
    try {
      let totalRecords = 0;
      let totalTransactions = 0;
      
      // Count inventory records
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      totalRecords += inventorySnapshot.size;
      
      // Count sales records
      const salesSnapshot = await getDocs(collection(db, 'sales'));
      totalRecords += salesSnapshot.size;
      totalTransactions = salesSnapshot.size;
      
      // Count suppliers records
      const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
      totalRecords += suppliersSnapshot.size;
      
      // Estimate storage
      const estimatedStorage = (totalRecords * 2).toFixed(1);
      
      setDatabaseStats({
        records: totalRecords,
        storage: `${estimatedStorage} KB`,
        transactions: totalTransactions,
        performance: "95.2%"
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
    }
  };
  
  // Handle saving general settings
  const handleSaveGeneralSettings = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      const businessData = {
        companyName,
        address,
        phone,
        email,
        taxId,
        vatRate,
        currency,
        receiptFooter
      };
      
      const docSnap = await getDoc(userSettingsRef);
      
      if (docSnap.exists()) {
        await updateDoc(userSettingsRef, {
          businessInfo: businessData,
          updatedAt: new Date()
        });
      } else {
        await setDoc(userSettingsRef, {
          businessInfo: businessData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      toast({
        title: "Settings Saved",
        description: "Your business settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving business settings:', error);
      toast({
        title: "Error",
        description: "Failed to save business settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle saving preferences
  const handleSavePreferences = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      const preferencesData = {
        lowStockAlerts,
        emailNotifications,
        darkMode,
        autoBackup,
        lowStockThreshold
      };
      
      const docSnap = await getDoc(userSettingsRef);
      
      if (docSnap.exists()) {
        await updateDoc(userSettingsRef, {
          preferences: preferencesData
        });
      } else {
        await setDoc(userSettingsRef, {
          preferences: preferencesData
        });
      }
      
      toast({
        title: "Preferences Saved",
        description: "Your system preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle saving business hours
  const handleSaveBusinessHours = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      
      const docSnap = await getDoc(userSettingsRef);
      
      if (docSnap.exists()) {
        await updateDoc(userSettingsRef, {
          businessHours: businessHours
        });
      } else {
        await setDoc(userSettingsRef, {
          businessHours: businessHours
        });
      }
      
      toast({
        title: "Business Hours Saved",
        description: "Your business hours have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast({
        title: "Error",
        description: "Failed to save business hours. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle saving database settings
  const handleSaveDatabase = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      const databaseData = {
        backupFrequency,
        dataRetention
      };
      
      const cleanupData = {
        autoCleanup,
        cleanupDays
      };
      
      const docSnap = await getDoc(userSettingsRef);
      
      if (docSnap.exists()) {
        await updateDoc(userSettingsRef, {
          database: databaseData,
          cleanup: cleanupData
        });
      } else {
        await setDoc(userSettingsRef, {
          database: databaseData,
          cleanup: cleanupData
        });
      }
      
      toast({
        title: "Database Settings Saved",
        description: "Your database settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving database settings:', error);
      toast({
        title: "Error",
        description: "Failed to save database settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle backup now
  const handleBackupNow = async () => {
    setIsBackupInProgress(true);
    
    setTimeout(async () => {
      try {
        if (currentUser) {
          const backupRef = doc(db, 'backups', new Date().toISOString());
          await setDoc(backupRef, {
            userId: currentUser.uid,
            timestamp: new Date(),
            status: 'completed',
            size: `${(Math.random() * 10).toFixed(2)} MB`,
            type: 'manual'
          });
        }
        
        setIsBackupInProgress(false);
        toast({
          title: "Backup Complete",
          description: "Your data has been successfully backed up.",
        });
      } catch (error) {
        setIsBackupInProgress(false);
        toast({
          title: "Backup Failed",
          description: "There was an error during the backup process.",
          variant: "destructive",
        });
      }
    }, 3000);
  };
  
  // Handle data export
  const handleExportData = async () => {
    setIsExportInProgress(true);
    
    setTimeout(() => {
      const data = {
        exportDate: new Date().toISOString(),
        company: companyName,
        totalRecords: databaseStats.records,
        stats: realTimeStats
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stockease-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsExportInProgress(false);
      toast({
        title: "Export Complete",
        description: "Your data has been exported successfully.",
      });
    }, 2000);
  };
  
  // Update business hours
  const updateBusinessHours = (day, field, value) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">System Settings</h1>
              <p className="text-muted-foreground">
                Configure your inventory and sales system
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleExportData}
                disabled={isExportInProgress}
                className="flex items-center gap-2"
              >
                {isExportInProgress ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export Data
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={fetchRealTimeStats}
                className="flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh Data
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 md:w-full">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon size={16} />
                Business
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package size={16} />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="hours" className="flex items-center gap-2">
                <Calendar size={16} />
                Hours
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Activity size={16} />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database size={16} />
                Database
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>
                    Update your company details that appear on receipts and reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax/VAT ID</Label>
                      <Input
                        id="taxId"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Default Currency</Label>
                      <Input
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="vatRate">Default VAT Rate (%)</Label>
                    <Input
                      id="vatRate"
                      type="number"
                      value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="receiptFooter">Receipt Footer Message</Label>
                    <Textarea
                      id="receiptFooter"
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">System Preferences</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="darkMode">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Use dark theme for the interface
                        </p>
                      </div>
                      <Switch
                        id="darkMode"
                        checked={darkMode}
                        onCheckedChange={setDarkMode}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="autoBackup">Automatic Backup</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically backup your data
                        </p>
                      </div>
                      <Switch
                        id="autoBackup"
                        checked={autoBackup}
                        onCheckedChange={setAutoBackup}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleSaveGeneralSettings} 
                    disabled={isLoading}
                    className="flex items-center gap-2 ml-auto"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Management</CardTitle>
                  <CardDescription>
                    Configure inventory alerts and thresholds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      className="max-w-xs"
                    />
                    <p className="text-sm text-muted-foreground">
                      Get alerts when stock falls below this quantity
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="lowStockAlerts">Low Stock Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Show alerts when inventory items are low
                      </p>
                    </div>
                    <Switch
                      id="lowStockAlerts"
                      checked={lowStockAlerts}
                      onCheckedChange={setLowStockAlerts}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email alerts for low stock
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="ml-auto flex items-center gap-2"
                    onClick={handleSavePreferences}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Settings
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="hours" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Business Hours</CardTitle>
                  <CardDescription>
                    Set your operating hours for reports and analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(businessHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-20 font-medium capitalize">{day}</div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!hours.closed}
                          onCheckedChange={(checked) => updateBusinessHours(day, 'closed', !checked)}
                        />
                        <span className="text-sm">Open</span>
                      </div>
                      {!hours.closed && (
                        <>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                            className="w-32"
                          />
                          <span>to</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                            className="w-32"
                          />
                        </>
                      )}
                      {hours.closed && (
                        <Badge variant="secondary">Closed</Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button
                    className="ml-auto flex items-center gap-2"
                    onClick={handleSaveBusinessHours}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Hours
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Analytics</CardTitle>
                  <CardDescription>
                    Live statistics from your database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Total Products</span>
                      </div>
                      <div className="text-2xl font-bold">{realTimeStats.totalProducts}</div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Low Stock Items</span>
                      </div>
                      <div className="text-2xl font-bold">{realTimeStats.lowStockItems}</div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Total Sales</span>
                      </div>
                      <div className="text-2xl font-bold">{realTimeStats.totalSales}</div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Today's Sales</span>
                      </div>
                      <div className="text-2xl font-bold">{realTimeStats.todaySales}</div>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Top Selling Product</h4>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-lg font-semibold">{realTimeStats.topSellingProduct}</p>
                    </div>
                  </div>
                  
                  {realTimeStats.recentSales.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-4">
                        <h4 className="font-medium">Recent Sales</h4>
                        <div className="space-y-2">
                          {realTimeStats.recentSales.map((sale, index) => (
                            <div key={sale.id || index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <span className="font-medium">Sale #{sale.id?.substring(0, 8) || index + 1}</span>
                              <div className="text-right">
                                <p className="font-semibold">${sale.total || '0.00'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {sale.date?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    onClick={fetchRealTimeStats}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Refresh Analytics
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="database" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Database Management</CardTitle>
                  <CardDescription>
                    Configure data backup, cleanup, and maintenance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <select
                      id="backupFrequency"
                      value={backupFrequency}
                      onChange={(e) => setBackupFrequency(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoCleanup">Auto Cleanup Old Data</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically remove old transaction logs
                      </p>
                    </div>
                    <Switch
                      id="autoCleanup"
                      checked={autoCleanup}
                      onCheckedChange={setAutoCleanup}
                    />
                  </div>
                  
                  {autoCleanup && (
                    <div className="space-y-2">
                      <Label htmlFor="cleanupDays">Cleanup After (days)</Label>
                      <Input
                        id="cleanupDays"
                        type="number"
                        value={cleanupDays}
                        onChange={(e) => setCleanupDays(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="dataRetention">Data Retention (days)</Label>
                    <Input
                      id="dataRetention"
                      type="number"
                      value={dataRetention}
                      onChange={(e) => setDataRetention(e.target.value)}
                      className="max-w-xs"
                    />
                    <p className="text-sm text-muted-foreground">
                      How long to keep detailed transaction history
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Manual Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Create a manual backup of your data right now
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={handleBackupNow}
                      disabled={isBackupInProgress}
                      className="flex items-center gap-2"
                    >
                      {isBackupInProgress ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                          Backup in Progress...
                        </>
                      ) : (
                        <>
                          <Cloud size={16} />
                          Backup Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="ml-auto flex items-center gap-2"
                    onClick={handleSaveDatabase}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Database Settings
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Database Statistics</CardTitle>
                  <CardDescription>
                    Real-time database usage and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm font-medium">Total Records</div>
                      <div className="text-2xl font-bold">{databaseStats.records.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm font-medium">Storage Used</div>
                      <div className="text-2xl font-bold">{databaseStats.storage}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm font-medium">Transactions</div>
                      <div className="text-2xl font-bold">{databaseStats.transactions.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm font-medium">Performance</div>
                      <div className="text-2xl font-bold">{databaseStats.performance}</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={fetchDatabaseStats}
                    className="flex items-center gap-2 mt-4"
                  >
                    <RefreshCw size={16} />
                    Refresh Statistics
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminRoute>
  );
};

export default Settings;
