
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { InventoryItem, formatToRupees } from "@/types/inventory";
import { AlertTriangle, Search, Package, ShoppingCart, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

const StockAlerts = () => {
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log("StockAlerts: Setting up real-time listener for inventory");
    
    const q = query(collection(db, "inventory"), orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log("StockAlerts: Received inventory data", querySnapshot.size, "items");
        const items: InventoryItem[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log("StockAlerts: Processing item", doc.id, data);
          
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
        
        console.log("StockAlerts: Total items loaded:", items.length);
        setAllItems(items);
        setLastUpdated(new Date());
        setIsLoading(false);
      },
      (error) => {
        console.error("StockAlerts: Error fetching inventory:", error);
        toast({
          title: "Error",
          description: "Failed to load inventory data for stock alerts.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );

    return () => {
      console.log("StockAlerts: Cleaning up listener");
      unsubscribe();
    };
  }, [toast]);

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

  const getAlertBadge = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (item.quantity <= item.reorderLevel) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    }
    return null;
  };

  const getAlertPriority = (item: InventoryItem) => {
    if (item.quantity === 0) return "Critical";
    if (item.quantity <= Math.ceil(item.reorderLevel * 0.5)) return "High";
    if (item.quantity <= item.reorderLevel) return "Medium";
    return "Low";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "text-red-700 font-bold";
      case "High": return "text-red-600";
      case "Medium": return "text-yellow-600";
      case "Low": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  const refreshData = () => {
    setIsLoading(true);
    // The real-time listener will automatically update the data
    setTimeout(() => setIsLoading(false), 1000);
  };

  console.log("StockAlerts: Rendering with", alertItems.length, "alert items");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Stock Alerts</h1>
            <p className="text-muted-foreground">
              Monitor low stock and out-of-stock items in real-time
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Out of Stock</h3>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
                <p className="text-xs text-red-700">Immediate action required</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900">Low Stock</h3>
                <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
                <p className="text-xs text-yellow-700">Below reorder level</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Total Alerts</h3>
                <p className="text-2xl font-bold text-blue-600">{alertItems.length}</p>
                <p className="text-xs text-blue-700">Items needing attention</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search alerts by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-[350px]"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredAlerts.length} of {alertItems.length} alerts shown
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading stock alerts...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Package className="h-12 w-12 mb-2" />
                      <h3 className="text-lg font-medium">
                        {searchTerm ? "No matching alerts found" : "No stock alerts"}
                      </h3>
                      <p>
                        {searchTerm 
                          ? "Try adjusting your search terms." 
                          : "All items are adequately stocked."
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((item) => {
                  const priority = getAlertPriority(item);
                  const stockValue = item.quantity * item.price;
                  
                  return (
                    <TableRow key={item.id} className={item.quantity === 0 ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.quantity === 0 ? "text-red-600 font-bold" : "text-yellow-600 font-medium"}>
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{item.reorderLevel}</TableCell>
                      <TableCell>{getAlertBadge(item)}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${getPriorityColor(priority)}`}>
                          {priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatToRupees(item.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatToRupees(stockValue)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {alertItems.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Actions</h3>
            <div className="text-sm text-blue-800">
              <p>• Review out-of-stock items immediately to avoid lost sales</p>
              <p>• Consider placing orders for low-stock items</p>
              <p>• Update reorder levels if needed to optimize inventory</p>
              <p>• Check with suppliers for availability and lead times</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StockAlerts;
