
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileText, Printer, Mail, BarChart2, CreditCard } from "lucide-react";
import { formatToRupees } from "@/types/inventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useSalesReportData } from "@/services/reportsService";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const [timeRange, setTimeRange] = useState<string>("month");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const { toast } = useToast();
  
  const { 
    data, 
    isLoading, 
    error, 
    exportToPDF, 
    exportToExcel,
    exportProductData,
    exportTransactionData,
    exportPaymentMethodData
  } = useSalesReportData(timeRange);
  
  // Filter transactions based on customer name
  const filteredTransactions = data?.allTransactions.filter(transaction => 
    transaction.customer.toLowerCase().includes(customerFilter.toLowerCase())
  ) || [];
  
  // Get payment method data
  const paymentMethodData = data?.paymentMethodData || [];
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const PAYMENT_COLORS = ['#00C49F', '#0088FE'];
  
  // Handle export actions
  const handleExportPDF = () => {
    if (exportToPDF()) {
      toast({
        title: "PDF Report Generated",
        description: "The sales report has been downloaded as a PDF"
      });
    } else {
      toast({
        title: "Error Generating PDF",
        description: "There was a problem creating the PDF report",
        variant: "destructive"
      });
    }
  };
  
  const handleExportExcel = () => {
    if (exportToExcel()) {
      toast({
        title: "Excel Report Generated",
        description: "The sales report has been downloaded as an Excel file"
      });
    } else {
      toast({
        title: "Error Generating Excel Report",
        description: "There was a problem creating the Excel report",
        variant: "destructive"
      });
    }
  };
  
  const handleExportPaymentMethodData = () => {
    if (exportPaymentMethodData()) {
      toast({
        title: "Payment Method Report Generated",
        description: "The payment method analysis has been downloaded"
      });
    } else {
      toast({
        title: "Error Generating Report",
        description: "There was a problem creating the payment method report",
        variant: "destructive"
      });
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">
              Generate and download business reports
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
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
        </div>
        
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
                ) : (
                  formatToRupees(data.summary.totalSales)
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  data.summary.transactions
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                ) : (
                  formatToRupees(data.summary.averageSale)
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  `${data.summary.profitMargin.toFixed(1)}%`
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Report Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Monthly Sales Chart */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Monthly Sales</CardTitle>
                  <CardDescription>Sales performance over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.monthlySalesData}
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
                        <Bar dataKey="sales" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleExportPDF} disabled={isLoading}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </Button>
                  <Button variant="outline" onClick={handleExportExcel} disabled={isLoading}>
                    <Download className="mr-2 h-4 w-4" />
                    Export as Excel
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Top Products Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Products</CardTitle>
                  <CardDescription>Best performing products by revenue</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : data.topProducts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No product data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.topProducts}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {data.topProducts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatToRupees(value as number), 'Revenue']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={exportProductData}
                    disabled={isLoading}
                  >
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Export Product Analysis
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Payment Methods Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Analysis of payment methods used</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : paymentMethodData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No payment method data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentMethodData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} transactions`, 'Count']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleExportPaymentMethodData}
                    disabled={isLoading}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Export Payment Analysis
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Last 5 sales transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-12 rounded"></div>
                    ))}
                  </div>
                ) : data.recentTransactions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No transactions to display
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Payment Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">#{transaction.id.substring(0, 8)}</TableCell>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell>{transaction.customer}</TableCell>
                            <TableCell>{transaction.items}</TableCell>
                            <TableCell className="text-right">{formatToRupees(transaction.total)}</TableCell>
                            <TableCell>{transaction.paymentMethod || "Cash"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>
                  Detailed list of all sales transactions
                </CardDescription>
                <div className="pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Search by customer name..."
                        value={customerFilter}
                        onChange={(e) => setCustomerFilter(e.target.value)}
                        className="pl-8"
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-5 w-5 absolute left-2 top-2.5 text-muted-foreground"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                        />
                      </svg>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={exportTransactionData}
                      className="min-w-[130px]"
                      disabled={isLoading}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-12 rounded"></div>
                    ))}
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No transactions match your search criteria
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Payment Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">#{transaction.id.substring(0, 8)}</TableCell>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell>{transaction.customer}</TableCell>
                            <TableCell>{transaction.items}</TableCell>
                            <TableCell className="text-right">{formatToRupees(transaction.total)}</TableCell>
                            <TableCell>{transaction.paymentMethod || "Cash"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredTransactions.length} of {data.allTransactions?.length || 0} transactions
                </div>
                <Button 
                  variant="outline"
                  onClick={() => window.print()}
                  disabled={isLoading}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Sales Analysis</CardTitle>
                <CardDescription>Detailed breakdown of product performance</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-12 rounded"></div>
                    ))}
                  </div>
                ) : data.topProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No product data available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topProducts.map((product) => {
                          const percentOfTotal = (product.value / data.summary.totalSales) * 100;
                          
                          return (
                            <TableRow key={product.name}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-right">{formatToRupees(product.value)}</TableCell>
                              <TableCell className="text-right">{percentOfTotal.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={exportProductData}
                  disabled={isLoading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Product Analysis
                </Button>
              </CardFooter>
            </Card>
            
            {/* Product Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Product Sales Distribution</CardTitle>
                <CardDescription>Visual representation of sales by product</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : data.topProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No product data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topProducts}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 30,
                        left: 60,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 'dataMax']} tickFormatter={(value) => formatToRupees(value)} />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [formatToRupees(value as number), 'Revenue']} />
                      <Legend />
                      <Bar dataKey="value" name="Revenue" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Payment Methods Tab */}
          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                  <div>
                    <CardTitle>Payment Method Analysis</CardTitle>
                    <CardDescription>Breakdown of transactions by payment type</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4 sm:mt-0"
                    onClick={handleExportPaymentMethodData}
                    disabled={isLoading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Analysis
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : paymentMethodData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <p>No payment method data available</p>
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
                        <h3 className="text-lg font-medium">Payment Method Distribution</h3>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Payment Method</th>
                              <th className="text-center py-2">Transactions</th>
                              <th className="text-right py-2">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentMethodData.map((item) => {
                              const total = paymentMethodData.reduce((sum, i) => sum + i.value, 0);
                              const percentage = (item.value / total) * 100;
                              
                              return (
                                <tr key={item.name} className="border-b">
                                  <td className="py-3">
                                    <div className="flex items-center">
                                      <div 
                                        className="w-3 h-3 mr-2 rounded-full"
                                        style={{ 
                                          backgroundColor: item.name === 'Cash' 
                                            ? PAYMENT_COLORS[0] 
                                            : PAYMENT_COLORS[1]
                                        }}
                                      ></div>
                                      {item.name}
                                    </div>
                                  </td>
                                  <td className="text-center">{item.value}</td>
                                  <td className="text-right">{percentage.toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                            <tr className="font-medium">
                              <td className="py-3">Total</td>
                              <td className="text-center">
                                {paymentMethodData.reduce((sum, item) => sum + item.value, 0)}
                              </td>
                              <td className="text-right">100%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Payment Method Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Metrics</CardTitle>
                <CardDescription>Key metrics comparison between payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-12 rounded"></div>
                    ))}
                  </div>
                ) : paymentMethodData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No payment method metrics available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Method</TableHead>
                          <TableHead className="text-right">Transaction Count</TableHead>
                          <TableHead className="text-right">Total Revenue</TableHead>
                          <TableHead className="text-right">Average Order Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.paymentMethodMetrics?.map((metric) => (
                          <TableRow key={metric.method}>
                            <TableCell className="font-medium">{metric.method}</TableCell>
                            <TableCell className="text-right">{metric.count}</TableCell>
                            <TableCell className="text-right">{formatToRupees(metric.revenue)}</TableCell>
                            <TableCell className="text-right">{formatToRupees(metric.averageOrderValue)}</TableCell>
                          </TableRow>
                        )) || []}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Payment Method Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Transactions by Payment Method</CardTitle>
                <CardDescription>Detailed transaction list filtered by payment method</CardDescription>
                <div className="pt-4">
                  <div className="flex items-center space-x-2">
                    <Label>Filter by payment method</Label>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All payment methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All payment methods</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Payment Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.allTransactions.slice(0, 10).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">#{transaction.id.substring(0, 8)}</TableCell>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell>{transaction.customer}</TableCell>
                          <TableCell className="text-right">{formatToRupees(transaction.total)}</TableCell>
                          <TableCell>{transaction.paymentMethod || "Cash"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  Showing top 10 transactions. Export data for full list.
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
