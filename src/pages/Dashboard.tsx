import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { DollarSign, Package, ShoppingCart, TrendingUp, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from "firebase/firestore";
import { InventoryItem, formatToRupees } from "@/types/inventory";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const Dashboard = () => {
  const { userData } = useAuth();
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [growth, setGrowth] = useState(0);
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
    
    // Get previous month's sales for growth calculation
    onSnapshot(
      query(
        collection(db, "sales"),
        where("timestamp", ">=", Timestamp.fromDate(previousMonthStart)),
        where("timestamp", "<", Timestamp.fromDate(currentMonthStart))
      ),
      (snapshot) => {
        let previousRevenue = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          previousRevenue += data.total || 0;
        });
        
        // Calculate growth percentage
        if (previousRevenue > 0) {
          const growthRate = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
          setGrowth(parseFloat(growthRate.toFixed(1)));
        }
      }
    );
    
    // Get inventory count
    const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => {
      setInventoryCount(snapshot.size);
    });
    
    // Get sales data for the bar chart (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      last6Months.push({
        name: monthNames[date.getMonth()],
        month: date.getMonth(),
        year: date.getFullYear()
      });
    }
    
    // Process sales data by month
    const unsubChartData = onSnapshot(
      query(collection(db, "sales"), orderBy("timestamp", "desc")),
      (snapshot) => {
        const monthlySales = last6Months.map((month) => {
          return { name: month.name, sales: 0 };
        });
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.timestamp) {
            const saleDate = data.timestamp.toDate();
            const saleMonth = saleDate.getMonth();
            const saleYear = saleDate.getFullYear();
            
            last6Months.forEach((month, index) => {
              if (month.month === saleMonth && month.year === saleYear) {
                monthlySales[index].sales += data.total || 0;
              }
            });
          }
        });
        
        setSalesData(monthlySales);
      }
    );
    
    // Get top products data
    const unsubTopProducts = onSnapshot(
      query(collection(db, "sales")),
      (snapshot) => {
        const productSales: {[key: string]: number} = {};
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => {
              if (!productSales[item.name]) {
                productSales[item.name] = 0;
              }
              productSales[item.name] += item.total || 0;
            });
          }
        });
        
        // Convert to array and sort
        const topProductsArray = Object.keys(productSales).map(name => ({
          name,
          value: productSales[name]
        })).sort((a, b) => b.value - a.value).slice(0, 4);
        
        setTopProducts(topProductsArray);
      }
    );
    
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
          let paymentMethod = data.paymentMethod || "Cash"; // Default to Cash if not specified
          
          // Normalize payment method to either "Cash" or "Online" regardless of case
          if (paymentMethod.toLowerCase() === "cash") {
            paymentMethod = "Cash";
          } else if (paymentMethod.toLowerCase() === "online") {
            paymentMethod = "Online";
          }
          
          paymentMethodCounts[paymentMethod] = (paymentMethodCounts[paymentMethod] || 0) + 1;
        });
        
        // Convert to array for the chart
        const paymentMethodArray = Object.keys(paymentMethodCounts).map(method => ({
          name: method,
          value: paymentMethodCounts[method]
        }));
        
        setPaymentMethodData(paymentMethodArray);
        setIsLoading(false);
      }
    );
    
    // Cleanup listeners on unmount
    return () => {
      unsubSales();
      unsubInventory();
      unsubChartData();
      unsubTopProducts();
      unsubPaymentMethods();
    };
  }, [totalRevenue]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const PAYMENT_COLORS = ['#00C49F', '#0088FE'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {userData?.role === 'admin' ? 'Administrator' : 'Employee'}!
          </p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatToRupees(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {growth > 0 ? '+' : ''}{growth}% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{salesCount}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventoryCount}</div>
              <p className="text-xs text-muted-foreground">
                Total items in stock
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{growth > 0 ? '+' : ''}{growth}%</div>
              <p className="text-xs text-muted-foreground">
                Compared to last month
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle>Monthly Sales</CardTitle>
              <CardDescription>
                Sales performance over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={salesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatToRupees(value as number), 'Revenue']} />
                    <Legend />
                    <Bar dataKey="sales" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          
          <Card className="col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>
                Most popular products by sales
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <p>No product sales data available yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topProducts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatToRupees(value as number), 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          
          {/* Payment Method Chart */}
          <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Distribution of payment methods used in transactions
                </CardDescription>
              </div>
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : paymentMethodData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <p>No payment method data available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={paymentMethodData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentMethodData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex flex-col justify-center">
                    <div className="space-y-4">
                      {paymentMethodData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 mr-2 rounded-full" 
                              style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }}
                            ></div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{item.value}</span>
                            <span className="text-muted-foreground text-sm">
                              ({((item.value / paymentMethodData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Transactions:</span>
                        <span className="font-bold">
                          {paymentMethodData.reduce((sum, item) => sum + item.value, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
