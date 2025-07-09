
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp, getDocs, DocumentData } from "firebase/firestore";
import { useState, useEffect } from "react";

// Types for analytics data
export interface SalesData {
  name: string;
  value: number;
  date?: Date;
}

export interface CategoryData {
  name: string;
  value: number;
}

export interface ProductPerformance {
  name: string;
  revenue: number;
  profit: number;
  cost: number;
}

export interface DailySales {
  name: string;
  sales: number;
}

export interface PaymentMethodData {
  name: string;
  value: number;
  trends?: Array<{
    date: string;
    [key: string]: number | string;
  }>;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  profitMargin: number;
  averageOrderValue: number;
  conversionRate: number;
  lastUpdated: Date;
}

// Hook for real-time sales data
export const useMonthlySalesData = (timeRange: string) => {
  const [data, setData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Calculate date range based on selected time period
    const now = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1); // Some date far in the past
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Directly query the sales collection for real-time data
    const salesRef = collection(db, "sales");
    const q = query(
      salesRef, 
      // Use timestamp instead of date for consistency with Dashboard
      where("timestamp", ">=", Timestamp.fromDate(startDate)),
      where("timestamp", "<=", Timestamp.fromDate(now)),
      orderBy("timestamp", "asc")
    );

    // Real-time listener
    try {
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        // Group sales by month
        const monthlySales = querySnapshot.docs.reduce((acc: Record<string, number>, doc) => {
          const data = doc.data();
          const date = data.timestamp?.toDate();
          
          // Skip if date is invalid
          if (!date) return acc;
          
          const monthYear = `${date.toLocaleString('default', { month: 'short' })}`;
          
          if (!acc[monthYear]) {
            acc[monthYear] = 0;
          }
          
          acc[monthYear] += data.total || 0;
          return acc;
        }, {});
        
        // If no data, provide some sample data
        if (Object.keys(monthlySales).length === 0) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          monthNames.forEach(month => {
            monthlySales[month] = Math.floor(Math.random() * 10000) + 5000;
          });
        }
        
        // Convert to array format needed for charts
        const formattedData = Object.keys(monthlySales).map(month => ({
          name: month,
          value: monthlySales[month],
        }));
        
        // Sort by month order
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        formattedData.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
        
        setData(formattedData);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching sales data:", error);
        setError(error.message);
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up sales data listener:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [timeRange]);

  return { data, isLoading, error };
};

// Hook for real-time category data
export const useCategoryData = () => {
  const [data, setData] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Get data from sales collection directly for real-time category distribution
    const salesRef = collection(db, "sales");
    
    try {
      const unsubscribe = onSnapshot(query(salesRef), (snapshot) => {
        // Process sales to extract category data
        const categoryMap: Record<string, number> = {};
        let totalSales = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => {
              const category = item.category || 'Uncategorized';
              if (!categoryMap[category]) {
                categoryMap[category] = 0;
              }
              const itemTotal = item.total || 0;
              categoryMap[category] += itemTotal;
              totalSales += itemTotal;
            });
          }
        });
        
        // If no data, provide sample data
        if (Object.keys(categoryMap).length === 0 || totalSales === 0) {
          const sampleCategories = [
            { name: "Electronics", value: 35 },
            { name: "Clothing", value: 25 },
            { name: "Food", value: 20 },
            { name: "Books", value: 15 },
            { name: "Other", value: 5 }
          ];
          setData(sampleCategories);
        } else {
          // Convert to percentage and format for chart
          const categoryData = Object.keys(categoryMap).map(category => ({
            name: category,
            value: Math.round((categoryMap[category] / totalSales) * 100)
          })).sort((a, b) => b.value - a.value).slice(0, 5);
          
          setData(categoryData);
        }
        
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching category data:", error);
        setError(error.message);
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up category data:", err);
      setError(err.message);
      setIsLoading(false);
      
      // Fallback to sample data
      const sampleCategories = [
        { name: "Electronics", value: 35 },
        { name: "Clothing", value: 25 },
        { name: "Food", value: 20 },
        { name: "Books", value: 15 },
        { name: "Other", value: 5 }
      ];
      setData(sampleCategories);
    }
  }, []);

  return { data, isLoading, error };
};

// Hook for real-time product performance data
export const useProductPerformance = () => {
  const [data, setData] = useState<ProductPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Get data from sales collection for real-time product performance
    const salesRef = collection(db, "sales");
    
    try {
      const unsubscribe = onSnapshot(query(salesRef), (snapshot) => {
        // Process sales to extract product performance data
        const productMap: Record<string, {revenue: number, cost: number}> = {};
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => {
              const productName = item.name || 'Unknown Product';
              if (!productMap[productName]) {
                productMap[productName] = {revenue: 0, cost: 0};
              }
              const itemTotal = item.total || 0;
              // Assume cost is 60% of revenue for sample calculation
              const itemCost = item.cost || itemTotal * 0.6;
              
              productMap[productName].revenue += itemTotal;
              productMap[productName].cost += itemCost;
            });
          }
        });
        
        // If no data, provide sample data
        if (Object.keys(productMap).length === 0) {
          const sampleProducts = [
            { name: "Laptop", revenue: 45000, cost: 30000, profit: 15000 },
            { name: "Smartphone", revenue: 35000, cost: 25000, profit: 10000 },
            { name: "Tablet", revenue: 25000, cost: 15000, profit: 10000 },
            { name: "Headphones", revenue: 15000, cost: 8000, profit: 7000 },
            { name: "Smartwatch", revenue: 10000, cost: 5000, profit: 5000 }
          ];
          setData(sampleProducts);
        } else {
          // Format for chart and calculate profit
          const productData = Object.keys(productMap).map(product => ({
            name: product,
            revenue: productMap[product].revenue,
            cost: productMap[product].cost,
            profit: productMap[product].revenue - productMap[product].cost
          })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
          
          setData(productData);
        }
        
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching product performance data:", error);
        setError(error.message);
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up product data:", err);
      setError(err.message);
      setIsLoading(false);
      
      // Fallback to sample data
      const sampleProducts = [
        { name: "Laptop", revenue: 45000, cost: 30000, profit: 15000 },
        { name: "Smartphone", revenue: 35000, cost: 25000, profit: 10000 },
        { name: "Tablet", revenue: 25000, cost: 15000, profit: 10000 },
        { name: "Headphones", revenue: 15000, cost: 8000, profit: 7000 },
        { name: "Smartwatch", revenue: 10000, cost: 5000, profit: 5000 }
      ];
      setData(sampleProducts);
    }
  }, []);

  return { data, isLoading, error };
};

// Hook for real-time daily sales data
export const useDailySales = () => {
  const [data, setData] = useState<DailySales[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Get data for last 7 days
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    
    const salesRef = collection(db, "sales");
    const q = query(
      salesRef, 
      where("timestamp", ">=", Timestamp.fromDate(weekAgo)),
      orderBy("timestamp", "asc")
    );
    
    try {
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        // Group sales by day of week
        const dailySales = querySnapshot.docs.reduce((acc: Record<string, number>, doc) => {
          const data = doc.data();
          const date = data.timestamp?.toDate();
          
          // Skip if date is invalid
          if (!date) return acc;
          
          const day = date.toLocaleString('default', { weekday: 'short' });
          
          if (!acc[day]) {
            acc[day] = 0;
          }
          
          acc[day] += data.total || 0;
          return acc;
        }, {});
        
        // Ensure all days of week are represented
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const formattedData = daysOfWeek.map(day => ({
          name: day,
          sales: dailySales[day] || 0,
        }));
        
        // If no data, generate sample
        if (Object.values(dailySales).every(val => val === 0)) {
          const sampleData = daysOfWeek.map(day => ({
            name: day,
            sales: Math.floor(Math.random() * 5000) + 1000,
          }));
          setData(sampleData);
        } else {
          setData(formattedData);
        }
        
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching daily sales data:", error);
        setError(error.message);
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up daily sales data listener:", err);
      setError(err.message);
      setIsLoading(false);
      
      // Fallback to sample data
      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const sampleData = daysOfWeek.map(day => ({
        name: day,
        sales: Math.floor(Math.random() * 5000) + 1000,
      }));
      setData(sampleData);
    }
  }, []);

  return { data, isLoading, error };
};

// Hook for analytics summary data
export const useAnalyticsSummary = () => {
  const [data, setData] = useState<AnalyticsSummary>({
    totalRevenue: 0,
    profitMargin: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    lastUpdated: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Get sales data to calculate summary metrics
    const salesRef = collection(db, "sales");
    
    try {
      const unsubscribe = onSnapshot(query(salesRef), (snapshot) => {
        if (snapshot.empty) {
          // If no data, provide sample summary
          const sampleSummary = {
            totalRevenue: 45231.89,
            profitMargin: 42.3,
            averageOrderValue: 52.45,
            conversionRate: 24.8,
            lastUpdated: new Date(),
          };
          setData(sampleSummary);
        } else {
          // Calculate summary metrics from sales data
          let totalRevenue = 0;
          let totalCost = 0;
          let totalOrders = 0;
          let totalItems = 0;
          
          snapshot.forEach(doc => {
            const sale = doc.data();
            totalRevenue += sale.total || 0;
            totalOrders++;
            
            // Calculate costs and items
            if (sale.items && Array.isArray(sale.items)) {
              totalItems += sale.items.length;
              sale.items.forEach((item: any) => {
                // Assume cost is 60% of item price if not explicitly provided
                totalCost += item.cost || (item.total * 0.6);
              });
            }
          });
          
          // Calculate metrics
          const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
          const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
          // Simulate conversion rate - in a real app this would come from visits/orders
          const conversionRate = Math.min(25, (totalOrders / Math.max(totalOrders * 4, 1)) * 100);
          
          setData({
            totalRevenue,
            profitMargin: parseFloat(profitMargin.toFixed(1)),
            averageOrderValue,
            conversionRate: parseFloat(conversionRate.toFixed(1)),
            lastUpdated: new Date(),
          });
        }
        
        setIsLoading(false);
      }, (err) => {
        console.error("Error in analytics summary listener:", err);
        setError(err.message);
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error fetching analytics summary:", err);
      setError(err.message);
      setIsLoading(false);
      
      // Fallback to sample data
      const sampleSummary = {
        totalRevenue: 45231.89,
        profitMargin: 42.3,
        averageOrderValue: 52.45,
        conversionRate: 24.8,
        lastUpdated: new Date(),
      };
      setData(sampleSummary);
    }
  }, []);

  return { data, isLoading, error };
};

// Hook for payment method analytics
export const usePaymentMethodData = () => {
  const [data, setData] = useState<PaymentMethodData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Get data from sales collection for payment method analysis
    const salesRef = collection(db, "sales");
    
    try {
      const unsubscribe = onSnapshot(query(salesRef), (snapshot) => {
        // Process sales to extract payment method data
        const paymentMethodMap: Record<string, number> = {};
        
        // Data for trends analysis
        const allDates: Record<string, {
          date: string;
          Cash: number;
          Online: number;
        }> = {};
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // For payment method counts - Normalize to capitalize first letter
          let paymentMethod = data.paymentMethod || "Cash"; // Default to Cash if not specified
          
          // Normalize payment method to either "Cash" or "Online" regardless of case
          if (paymentMethod.toLowerCase() === "cash") {
            paymentMethod = "Cash";
          } else if (paymentMethod.toLowerCase() === "online") {
            paymentMethod = "Online";
          }
          
          paymentMethodMap[paymentMethod] = (paymentMethodMap[paymentMethod] || 0) + 1;
          
          // For trends over time
          if (data.timestamp) {
            const date = data.timestamp.toDate();
            const monthYear = date.toLocaleDateString('default', { month: 'short', year: '2-digit' });
            
            if (!allDates[monthYear]) {
              allDates[monthYear] = {
                date: monthYear,
                Cash: 0,
                Online: 0
              };
            }
            
            // Increment the count for this payment method in this month
            if (paymentMethod === "Cash") {
              allDates[monthYear].Cash += 1;
            } else if (paymentMethod === "Online") {
              allDates[monthYear].Online += 1;
            }
          }
        });
        
        // If no data, provide sample data
        if (Object.entries(paymentMethodMap).length === 0 || 
            Object.values(paymentMethodMap).every(v => v === 0)) {
          const samplePaymentMethods: PaymentMethodData[] = [
            { name: "Cash", value: 65, trends: [] },
            { name: "Online", value: 35, trends: [] }
          ];
          setData(samplePaymentMethods);
        } else {
          // Convert to array format needed for charts
          const formattedData: PaymentMethodData[] = Object.keys(paymentMethodMap).map(method => ({
            name: method,
            value: paymentMethodMap[method],
            trends: [] // Initialize with empty trends array
          }));
          
          // Add trends data if available
          if (Object.keys(allDates).length > 0) {
            const trendData = Object.values(allDates).sort((a, b) => {
              // Sort by month/year
              const [aMonth, aYear] = a.date.split(' ');
              const [bMonth, bYear] = b.date.split(' ');
              
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              
              // Compare years first
              if (aYear !== bYear) {
                return parseInt(aYear) - parseInt(bYear);
              }
              // Then compare months
              return months.indexOf(aMonth) - months.indexOf(bMonth);
            });
            
            // Only add trends if we have more than one data point
            if (trendData.length > 1) {
              formattedData.forEach(item => {
                item.trends = trendData;
              });
            }
          }
          
          setData(formattedData);
        }
        
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching payment method data:", error);
        setError(error.message);
        setIsLoading(false);
        
        // Fallback to sample data
        const samplePaymentMethods: PaymentMethodData[] = [
          { name: "Cash", value: 65, trends: [] },
          { name: "Online", value: 35, trends: [] }
        ];
        setData(samplePaymentMethods);
      });
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up payment method data listener:", err);
      setError(err.message);
      setIsLoading(false);
      
      // Fallback to sample data
      const samplePaymentMethods: PaymentMethodData[] = [
        { name: "Cash", value: 65, trends: [] },
        { name: "Online", value: 35, trends: [] }
      ];
      setData(samplePaymentMethods);
    }
  }, []);

  return { data, isLoading, error };
};
