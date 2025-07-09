
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { useMonthlySalesData, useCategoryData, useProductPerformance, useDailySales, useAnalyticsSummary, usePaymentMethodData } from "@/services/analyticsService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { formatToRupees } from "@/types/inventory";
import { Activity, Layers, CreditCard } from "lucide-react";

const Analytics = () => {
  const [timeRange, setTimeRange] = useState<string>("month");
  const { data: salesData, isLoading: isSalesLoading } = useMonthlySalesData(timeRange);
  const { data: categoryData, isLoading: isCategoryLoading } = useCategoryData();
  const { data: productData, isLoading: isProductLoading } = useProductPerformance();
  const { data: dailySalesData, isLoading: isDailyLoading } = useDailySales();
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useAnalyticsSummary();
  const { data: paymentMethodData, isLoading: isPaymentLoading } = usePaymentMethodData();
  
  const PRODUCT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const CATEGORY_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c'];
  const PAYMENT_COLORS = ['#00C49F', '#0088FE', '#FFBB28'];
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your business performance with detailed analytics
          </p>
        </div>
        
        {/* Time range selector */}
        <div className="flex justify-end">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="quarter">Past Quarter</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Analytics Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isAnalyticsLoading 
                  ? <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
                  : formatToRupees(analyticsData.totalRevenue)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {timeRange === 'all' ? 'All time' : `Past ${timeRange}`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isAnalyticsLoading 
                  ? <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  : `${analyticsData.profitMargin.toFixed(1)}%`
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Gross profit percentage
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isAnalyticsLoading 
                  ? <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                  : formatToRupees(analyticsData.averageOrderValue)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Per transaction
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isAnalyticsLoading 
                  ? <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  : `${analyticsData.conversionRate.toFixed(1)}%`
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Visitors to customers
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs for different analytics sections */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
            <TabsTrigger value="products">Product Analytics</TabsTrigger>
            <TabsTrigger value="categories">Category Analysis</TabsTrigger>
            <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales" className="space-y-4">
            {/* Sales over time */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>
                  Revenue over time for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isSalesLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={salesData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatToRupees(value as number), 'Revenue']} />
                      <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            {/* Daily sales breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales</CardTitle>
                <CardDescription>
                  Sales distribution by day of week
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isDailyLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailySalesData}
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
                      <Tooltip formatter={(value) => [formatToRupees(value as number), 'Sales']} />
                      <Legend />
                      <Bar dataKey="sales" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="products" className="space-y-4">
            {/* Product performance chart */}
            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
                <CardDescription>
                  Revenue, cost and profit by product
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isProductLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatToRupees(value as number), '']} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" stackId="a" fill="#8884d8" />
                      <Bar dataKey="cost" name="Cost" stackId="a" fill="#82ca9d" />
                      <Bar dataKey="profit" name="Profit" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            {/* Category distribution chart */}
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>
                  Sales breakdown by product category
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isCategoryLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="space-y-4">
                        {categoryData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div 
                                className="w-4 h-4 mr-2 rounded-full" 
                                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                              ></div>
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <span className="font-medium">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            {/* Payment Method Analytics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Method Analysis</CardTitle>
                    <CardDescription>
                      Distribution of payment methods used in transactions
                    </CardDescription>
                  </div>
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isPaymentLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={paymentMethodData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {paymentMethodData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} transactions`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="text-lg font-medium mb-4">Payment Method Distribution</h3>
                      <div className="space-y-6">
                        {paymentMethodData.map((item, index) => (
                          <div key={item.name} className="space-y-2">
                            <div className="flex items-center justify-between">
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
                            
                            {/* Progress bar for visual comparison */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div 
                                className="h-2.5 rounded-full" 
                                style={{ 
                                  width: `${(item.value / paymentMethodData.reduce((sum, i) => sum + i.value, 0)) * 100}%`,
                                  backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length]
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="pt-4 mt-4 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Transactions:</span>
                            <span className="font-bold">
                              {paymentMethodData.reduce((sum, item) => sum + item.value, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Trends</CardTitle>
                <CardDescription>
                  How payment methods have changed over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isPaymentLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : paymentMethodData[0]?.trends ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={paymentMethodData[0]?.trends || []}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {paymentMethodData.map((item, index) => (
                        <Line 
                          key={item.name}
                          type="monotone" 
                          dataKey={item.name} 
                          name={item.name}
                          stroke={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} 
                          activeDot={{ r: 8 }} 
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p>Not enough historical data to show payment method trends</p>
                    <p className="text-sm mt-2">Continue tracking payments to see trends over time</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
