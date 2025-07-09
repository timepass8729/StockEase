
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp, getDocs, doc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { formatToRupees } from "@/types/inventory";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { toast } from "@/components/ui/use-toast";

// Types for reports data
export interface Transaction {
  id: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod?: string;
}

export interface PaymentMethodMetric {
  method: string;
  count: number;
  revenue: number;
  averageOrderValue: number;
}

export interface SalesReport {
  monthlySalesData: Array<{name: string, sales: number}>;
  topProducts: Array<{name: string, value: number}>;
  recentTransactions: Transaction[];
  allTransactions: Transaction[];
  paymentMethodData: Array<{name: string, value: number}>;
  paymentMethodMetrics: PaymentMethodMetric[];
  summary: {
    totalSales: number;
    transactions: number;
    averageSale: number;
    profitMargin: number;
  };
}

// Hook for real-time sales report data
export const useSalesReportData = (timeRange: string) => {
  const [data, setData] = useState<SalesReport>({
    monthlySalesData: [],
    topProducts: [],
    recentTransactions: [],
    allTransactions: [],
    paymentMethodData: [],
    paymentMethodMetrics: [],
    summary: {
      totalSales: 0,
      transactions: 0,
      averageSale: 0,
      profitMargin: 0,
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
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

    // Real-time listener for ALL sales data (no limit)
    const salesRef = collection(db, "sales");
    let salesQuery;
    
    if (timeRange === 'all') {
      // For 'all' time range, get all transactions without date filter
      salesQuery = query(salesRef, orderBy("timestamp", "desc"));
    } else {
      // For specific time ranges, filter by date
      salesQuery = query(
        salesRef,
        where("timestamp", ">=", Timestamp.fromDate(startDate)),
        where("timestamp", "<=", Timestamp.fromDate(now)),
        orderBy("timestamp", "desc")
      );
    }
    
    console.log(`Setting up listener for ${timeRange} sales data from ${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}`);
    
    try {
      // Set up real-time listener for ALL sales data
      const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
        console.log(`Retrieved ${snapshot.docs.length} transactions from Firebase`);
        
        if (snapshot.empty) {
          console.log("No transactions found in Firebase");
          // If no data, set empty data but don't fall back to sample data
          setData({
            monthlySalesData: [],
            topProducts: [],
            recentTransactions: [],
            allTransactions: [],
            paymentMethodData: [
              { name: "Cash", value: 0 },
              { name: "Online", value: 0 }
            ],
            paymentMethodMetrics: [
              { method: "Cash", count: 0, revenue: 0, averageOrderValue: 0 },
              { method: "Online", count: 0, revenue: 0, averageOrderValue: 0 }
            ],
            summary: {
              totalSales: 0,
              transactions: 0,
              averageSale: 0,
              profitMargin: 0
            }
          });
          setIsLoading(false);
          return;
        }
        
        // Process ALL sales data from Firebase
        const processedData = processSalesData(snapshot.docs);
        console.log(`Processed data with ${processedData.allTransactions.length} total transactions`);
        setData(processedData);
        setIsLoading(false);
      }, (err) => {
        console.error("Error in sales report listener:", err);
        setError(err.message);
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up sales report listeners:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [timeRange]);

  // Helper function to process sales data
  const processSalesData = (docs: any[]) => {
    console.log(`Processing ${docs.length} documents from Firebase`);
    
    // Process monthly sales data
    const monthlySales: Record<string, number> = {};
    
    // Process top products data
    const productSales: Record<string, number> = {};
    
    // Process payment methods data - Initialize with proper case
    const paymentMethods: Record<string, { count: number, revenue: number }> = {
      "Cash": { count: 0, revenue: 0 },
      "Online": { count: 0, revenue: 0 }
    };
    
    // Process ALL transactions
    const allTransactions: Transaction[] = [];
    let totalSales = 0;
    const transactionCount = docs.length;
    
    docs.forEach((doc, index) => {
      const sale = doc.data();
      const date = sale.timestamp?.toDate();
      
      if (!date) {
        console.warn(`Transaction ${doc.id} has no timestamp, skipping`);
        return;
      }
      
      // For monthly sales
      const monthName = date.toLocaleString('default', { month: 'short' });
      if (!monthlySales[monthName]) {
        monthlySales[monthName] = 0;
      }
      monthlySales[monthName] += sale.total || 0;
      
      // For total sales
      totalSales += sale.total || 0;
      
      // For payment methods - NORMALIZE to proper case
      let normalizedPaymentMethod = "Cash"; // Default to Cash
      if (sale.paymentMethod) {
        const method = sale.paymentMethod.toString().toLowerCase().trim();
        if (method === "online" || method === "card" || method === "digital") {
          normalizedPaymentMethod = "Online";
        } else {
          normalizedPaymentMethod = "Cash";
        }
      }
      
      // Add to payment method counts
      paymentMethods[normalizedPaymentMethod].count += 1;
      paymentMethods[normalizedPaymentMethod].revenue += sale.total || 0;
      
      // For product sales
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (!item.name) return;
          
          if (!productSales[item.name]) {
            productSales[item.name] = 0;
          }
          
          productSales[item.name] += item.total || (item.price * item.quantity) || 0;
        });
      }
      
      // Create transaction object for ALL transactions
      const transaction = {
        id: doc.id,
        date: date ? date.toISOString().split('T')[0] : '',
        customer: sale.customerName && typeof sale.customerName === 'string' && sale.customerName.trim() !== '' 
          ? sale.customerName 
          : 'Guest',
        items: sale.items?.length || 0,
        total: sale.total || 0,
        paymentMethod: normalizedPaymentMethod,
      };
      
      // Add to all transactions
      allTransactions.push(transaction);
    });
    
    console.log(`Processed ${allTransactions.length} transactions, total sales: ${formatToRupees(totalSales)}`);
    
    // Format monthly sales for chart
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySalesData = Object.keys(monthlySales).map(month => ({
      name: month,
      sales: monthlySales[month]
    })).sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
    
    // Format top products for chart
    const topProducts = Object.keys(productSales)
      .map(name => ({ name, value: productSales[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
      
    // Format payment methods data for chart - Only Cash and Online
    const paymentMethodData = [
      { name: "Cash", value: paymentMethods["Cash"].count },
      { name: "Online", value: paymentMethods["Online"].count }
    ];
    
    // Create payment method metrics - Only Cash and Online
    const paymentMethodMetrics: PaymentMethodMetric[] = [
      {
        method: "Cash",
        count: paymentMethods["Cash"].count,
        revenue: paymentMethods["Cash"].revenue,
        averageOrderValue: paymentMethods["Cash"].count > 0 
          ? paymentMethods["Cash"].revenue / paymentMethods["Cash"].count
          : 0
      },
      {
        method: "Online",
        count: paymentMethods["Online"].count,
        revenue: paymentMethods["Online"].revenue,
        averageOrderValue: paymentMethods["Online"].count > 0 
          ? paymentMethods["Online"].revenue / paymentMethods["Online"].count
          : 0
      }
    ];
    
    // Calculate summary data
    const averageSale = transactionCount > 0 ? totalSales / transactionCount : 0;
    
    // Get recent transactions (first 5 from all transactions)
    const recentTransactions = allTransactions.slice(0, 5);
    
    console.log(`Final data: ${allTransactions.length} total transactions, ${recentTransactions.length} recent transactions`);
    
    return {
      monthlySalesData,
      topProducts,
      recentTransactions,
      allTransactions, // This now contains ALL transactions from Firebase
      paymentMethodData,
      paymentMethodMetrics,
      summary: {
        totalSales,
        transactions: transactionCount,
        averageSale,
        profitMargin: 40.0 // Using a default profit margin
      }
    };
  };

  // Helper function to provide default sample data
  const provideDefaultData = () => {
    // Sample monthly sales
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySalesData = months.map(month => ({
      name: month,
      sales: Math.floor(Math.random() * 10000) + 5000
    }));
    
    // Sample top products
    const sampleProducts = [
      { name: "Laptop", value: 45000 },
      { name: "Smartphone", value: 35000 },
      { name: "Tablet", value: 25000 },
      { name: "Headphones", value: 15000 },
      { name: "Smartwatch", value: 10000 }
    ];
    
    // Sample payment methods
    const samplePaymentMethods = [
      { name: "Cash", value: 65 },
      { name: "Online", value: 35 }
    ];
    
    // Sample payment method metrics
    const samplePaymentMethodMetrics = [
      {
        method: "Cash",
        count: 65,
        revenue: 210000,
        averageOrderValue: 3230.77
      },
      {
        method: "Online",
        count: 35,
        revenue: 145000,
        averageOrderValue: 4142.86
      }
    ];
    
    // Sample customer names
    const customerNames = [
      "Rajesh Kumar", 
      "Priya Sharma", 
      "Amit Patel", 
      "Sunita Verma", 
      "Vijay Singh",
      "Neha Gupta",
      "Deepak Joshi",
      "Meera Reddy"
    ];
    
    // Sample payment methods for transactions
    const paymentMethods = ["Cash", "Online"];
    
    // Sample transactions
    const sampleTransactions = Array.from({ length: 5 }, (_, i) => ({
      id: `INV${10001 + i}`,
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      customer: customerNames[i % customerNames.length],
      items: Math.floor(Math.random() * 5) + 1,
      total: Math.floor(Math.random() * 5000) + 1000,
      paymentMethod: paymentMethods[i % 2]
    }));
    
    // Sample all transactions (more data)
    const sampleAllTransactions = Array.from({ length: 20 }, (_, i) => ({
      id: `INV${10001 + i}`,
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      customer: customerNames[i % customerNames.length],
      items: Math.floor(Math.random() * 5) + 1,
      total: Math.floor(Math.random() * 5000) + 1000,
      paymentMethod: paymentMethods[i % 2]
    }));
    
    // Calculate summary
    const totalSales = monthlySalesData.reduce((sum, item) => sum + item.sales, 0);
    
    setData({
      monthlySalesData,
      topProducts: sampleProducts,
      recentTransactions: sampleTransactions,
      allTransactions: sampleAllTransactions,
      paymentMethodData: samplePaymentMethods,
      paymentMethodMetrics: samplePaymentMethodMetrics,
      summary: {
        totalSales,
        transactions: 145,
        averageSale: Math.round(totalSales / 145),
        profitMargin: 38.5
      }
    });
  };

  // Update a transaction
  const updateTransaction = (transaction: Transaction) => {
    try {
      // For demo/sample data, just update the local state
      if (!db || data.allTransactions.some(t => t.id.startsWith('INV'))) {
        // We're using sample data, so just update in memory
        setData(prevData => {
          const updatedRecentTransactions = prevData.recentTransactions.map(t => 
            t.id === transaction.id ? transaction : t
          );
          
          const updatedAllTransactions = prevData.allTransactions.map(t => 
            t.id === transaction.id ? transaction : t
          );
          
          return {
            ...prevData,
            recentTransactions: updatedRecentTransactions,
            allTransactions: updatedAllTransactions
          };
        });
        
        console.log("Transaction updated in memory:", transaction);
        return true;
      }
      
      // For real data, update in Firebase
      const transactionRef = doc(db, "sales", transaction.id);
      
      // Prepare the update data
      // Note: We only update fields that are editable from the UI
      const updateData = {
        customer: transaction.customer,
        total: transaction.total,
        // If we had more fields in the form, we would update them here
      };
      
      // Update the document in Firebase
      // Note: This is async, but we don't wait for it here
      updateDoc(transactionRef, updateData)
        .then(() => {
          console.log("Transaction successfully updated in Firebase:", transaction.id);
        })
        .catch((error) => {
          console.error("Error updating transaction:", error);
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: "There was an error updating the transaction in the database"
          });
        });
      
      return true;
    } catch (err) {
      console.error("Error updating transaction:", err);
      return false;
    }
  };

  // Enhanced Export functions for reports
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const reportTitle = `Sales Report - ${timeRange} - ${new Date().toLocaleDateString()}`;
      
      // Add title
      doc.setFontSize(18);
      doc.text(reportTitle, 14, 20);
      
      // Add summary section
      doc.setFontSize(14);
      doc.text("Sales Summary", 14, 30);
      doc.setFontSize(10);
      doc.text(`Total Sales: ${formatToRupees(data.summary.totalSales)}`, 14, 40);
      doc.text(`Transactions: ${data.summary.transactions}`, 14, 45);
      doc.text(`Average Sale: ${formatToRupees(data.summary.averageSale)}`, 14, 50);
      doc.text(`Profit Margin: ${data.summary.profitMargin.toFixed(1)}%`, 14, 55);
      
      // Add monthly sales table
      doc.setFontSize(14);
      doc.text("Monthly Sales", 14, 65);
      
      const monthlySalesRows = data.monthlySalesData.map(item => [
        item.name, 
        formatToRupees(item.sales)
      ]);
      
      // @ts-ignore - jspdf-autotable adds this method
      doc.autoTable({
        startY: 70,
        head: [["Month", "Sales"]],
        body: monthlySalesRows,
      });
      
      // Add top products table
      const currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Top Products", 14, currentY);
      
      const topProductsRows = data.topProducts.map(item => [
        item.name, 
        formatToRupees(item.value)
      ]);
      
      // @ts-ignore - jspdf-autotable adds this method
      doc.autoTable({
        startY: currentY + 5,
        head: [["Product", "Sales"]],
        body: topProductsRows,
      });
      
      // Add transactions table
      const transY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Recent Transactions", 14, transY);
      
      const transactionRows = data.recentTransactions.map(item => [
        item.date,
        item.customer,
        item.items.toString(),
        formatToRupees(item.total)
      ]);
      
      // @ts-ignore - jspdf-autotable adds this method
      doc.autoTable({
        startY: transY + 5,
        head: [["Date", "Customer", "Items", "Total"]],
        body: transactionRows,
      });
      
      // Add footer
      doc.setFontSize(10);
      doc.text(`Report generated on ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
      
      // Save the PDF
      doc.save(`sales-report-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      return true;
    } catch (err) {
      console.error("Error generating PDF:", err);
      return false;
    }
  };

  // Enhanced Excel export function for more complete and formatted data
  const exportToExcel = () => {
    try {
      // Create workbook with proper formatting
      const wb = XLSX.utils.book_new();
      
      // Create a formatted header for the workbook
      const headerData = [
        [`Sales Report - ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`],
        [`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
        [],
      ];
      
      // Summary worksheet with detailed information
      const summaryData = [
        ...headerData,
        ["Sales Summary"],
        [],
        ["Metric", "Value"],
        ["Total Sales", formatToRupees(data.summary.totalSales)],
        ["Number of Transactions", data.summary.transactions],
        ["Average Sale Value", formatToRupees(data.summary.averageSale)],
        ["Profit Margin", `${data.summary.profitMargin.toFixed(1)}%`],
        ["Time Period", timeRange.charAt(0).toUpperCase() + timeRange.slice(1)],
        []
      ];
      
      const sSheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, sSheet, "Summary");
      
      // Enhanced Monthly sales worksheet with proper formatting
      const monthlyHeader = [
        ...headerData,
        ["Monthly Sales Breakdown"],
        [],
        ["Month", "Sales Value", "Formatted Value"]
      ];
      
      const monthlySalesData = [
        ...monthlyHeader,
        ...data.monthlySalesData.map(item => [
          item.name,
          item.sales,
          formatToRupees(item.sales)
        ])
      ];
      
      // Add monthly total row
      const monthlyTotal = data.monthlySalesData.reduce((sum, item) => sum + item.sales, 0);
      monthlySalesData.push(
        [],
        ["Total", monthlyTotal, formatToRupees(monthlyTotal)]
      );
      
      const mSheet = XLSX.utils.aoa_to_sheet(monthlySalesData);
      XLSX.utils.book_append_sheet(wb, mSheet, "Monthly Sales");
      
      // Enhanced Top products worksheet with detailed metrics
      const productsHeader = [
        ...headerData,
        ["Top Products by Sales"],
        [],
        ["Product Name", "Sales Value", "Formatted Value", "% of Total Sales"]
      ];
      
      const totalProductSales = data.topProducts.reduce((sum, item) => sum + item.value, 0);
      
      const topProductsData = [
        ...productsHeader,
        ...data.topProducts.map(item => {
          const salesValue = item.value;
          const percentOfTotal = (salesValue / totalProductSales) * 100;
          const estimatedProfit = salesValue * (data.summary.profitMargin / 100);
          
          return [
            item.name,
            salesValue,
            formatToRupees(salesValue),
            `${percentOfTotal.toFixed(2)}%`,
            formatToRupees(estimatedProfit),
            `${data.summary.profitMargin.toFixed(1)}%`
          ];
        })
      ];
      
      // Add total row
      topProductsData.push(
        [],
        ["Total", totalProductSales, formatToRupees(totalProductSales), "100%"]
      );
      
      const pSheet = XLSX.utils.aoa_to_sheet(topProductsData);
      XLSX.utils.book_append_sheet(wb, pSheet, "Top Products");
      
      // Enhanced Transactions worksheet with more detailed information
      const transactionsHeader = [
        ...headerData,
        ["Recent Transactions"],
        [],
        ["Transaction ID", "Date", "Customer", "Number of Items", "Total Value", "Formatted Total"]
      ];
      
      const transactionsData = [
        ...transactionsHeader,
        ...data.recentTransactions.map(item => [
          item.id,
          item.date,
          item.customer,
          item.items,
          item.total,
          formatToRupees(item.total)
        ])
      ];
      
      // Add transactions summary
      const transTotal = data.recentTransactions.reduce((sum, item) => sum + item.total, 0);
      transactionsData.push(
        [],
        ["Transactions Total", "", "", "", transTotal, formatToRupees(transTotal)]
      );
      
      const tSheet = XLSX.utils.aoa_to_sheet(transactionsData);
      XLSX.utils.book_append_sheet(wb, tSheet, "Transactions");
      
      // Apply some cell formatting - column widths
      const setColumnWidths = (ws: XLSX.WorkSheet) => {
        const cols = [
          { wch: 20 }, // Column A width
          { wch: 20 }, // Column B width
          { wch: 25 }, // Column C width
          { wch: 15 }, // Column D width
          { wch: 15 }, // Column E width
          { wch: 20 }, // Column F width
        ];
        ws['!cols'] = cols;
      };
      
      setColumnWidths(sSheet);
      setColumnWidths(mSheet);
      setColumnWidths(pSheet);
      setColumnWidths(tSheet);
      
      // Generate the Excel file with a descriptive filename
      const fileName = `sales-report-${timeRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`Successfully exported report to ${fileName}`);
      return true;
    } catch (err) {
      console.error("Error generating Excel:", err);
      return false;
    }
  };
  
  // Export specific product data with more detailed information
  const exportProductData = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create header with report information
      const headerData = [
        [`Product Sales Report - ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`],
        [`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
        [],
      ];
      
      // Product data with enhanced details
      const productsHeader = [
        ...headerData,
        ["Product Performance Analysis"],
        [],
        [
          "Product Name", 
          "Sales Value", 
          "Formatted Value", 
          "% of Total Sales", 
          "Estimated Profit", 
          "Profit Margin"
        ]
      ];
      
      const totalProductSales = data.topProducts.reduce((sum, item) => sum + item.value, 0);
      
      const productDetails = [
        ...productsHeader,
        ...data.topProducts.map(item => {
          const salesValue = item.value;
          const percentOfTotal = (salesValue / totalProductSales) * 100;
          const estimatedProfit = salesValue * (data.summary.profitMargin / 100);
          
          return [
            item.name,
            salesValue,
            formatToRupees(salesValue),
            `${percentOfTotal.toFixed(2)}%`,
            formatToRupees(estimatedProfit),
            `${data.summary.profitMargin.toFixed(1)}%`
          ];
        })
      ];
      
      // Add summary row
      productDetails.push(
        [],
        [
          "Total", 
          totalProductSales, 
          formatToRupees(totalProductSales), 
          "100%",
          formatToRupees(totalProductSales * (data.summary.profitMargin / 100)),
          `${data.summary.profitMargin.toFixed(1)}%`
        ]
      );
      
      const sheet = XLSX.utils.aoa_to_sheet(productDetails);
      
      // Set column widths for better readability
      sheet['!cols'] = [
        { wch: 25 }, // Product name
        { wch: 15 }, // Sales value
        { wch: 20 }, // Formatted value
        { wch: 15 }, // % of total
        { wch: 18 }, // Estimated profit
        { wch: 15 }, // Profit margin
      ];
      
      XLSX.utils.book_append_sheet(wb, sheet, "Product Analysis");
      
      // Generate file with specific name for product report
      const fileName = `product-sales-${timeRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`Successfully exported product report to ${fileName}`);
      return true;
    } catch (err) {
      console.error("Error generating product report:", err);
      return false;
    }
  };
  
  // Export transactions with enhanced details - FIXED to use allTransactions instead of recentTransactions
  const exportTransactionData = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create header with report information
      const headerData = [
        [`Transactions Report - ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`],
        [`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
        [],
      ];
      
      // More detailed transaction data export - Using allTransactions instead of recentTransactions
      const transactionsHeader = [
        ...headerData,
        ["Detailed Transaction Analysis"],
        [],
        [
          "Transaction ID", 
          "Date", 
          "Customer", 
          "Items Count", 
          "Amount", 
          "Formatted Amount",
          "% of Total Sales"
        ]
      ];
      
      // Use allTransactions instead of recentTransactions
      const totalTransactions = data.allTransactions.reduce((sum, item) => sum + item.total, 0);
      
      const transactionsDetails = [
        ...transactionsHeader,
        ...data.allTransactions.map(item => {
          const percentOfTotal = (item.total / totalTransactions) * 100;
          
          return [
            item.id,
            item.date,
            item.customer,
            item.items,
            item.total,
            formatToRupees(item.total),
            `${percentOfTotal.toFixed(2)}%`
          ];
        })
      ];
      
      // Add summary row using allTransactions for calculations
      transactionsDetails.push(
        [],
        [
          "Total", 
          `${data.allTransactions.length} transactions`, 
          "", 
          data.allTransactions.reduce((sum, item) => sum + item.items, 0),
          totalTransactions,
          formatToRupees(totalTransactions),
          "100%"
        ]
      );
      
      const sheet = XLSX.utils.aoa_to_sheet(transactionsDetails);
      
      // Set column widths for better readability
      sheet['!cols'] = [
        { wch: 20 }, // Transaction ID
        { wch: 15 }, // Date
        { wch: 25 }, // Customer
        { wch: 12 }, // Items count
        { wch: 15 }, // Amount
        { wch: 20 }, // Formatted amount
        { wch: 15 }, // % of total
      ];
      
      XLSX.utils.book_append_sheet(wb, sheet, "All Transactions");
      
      // Generate file with specific name for transactions report
      const fileName = `all-transactions-${timeRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`Successfully exported all transactions report to ${fileName}`);
      return true;
    } catch (err) {
      console.error("Error generating transactions report:", err);
      return false;
    }
  };

  // Export payment method data with enhanced analysis
  const exportPaymentMethodData = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create header with report information
      const headerData = [
        [`Payment Method Analysis Report - ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`],
        [`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
        [],
      ];
      
      // Payment method summary sheet
      const summaryHeader = [
        ...headerData,
        ["Payment Method Distribution"],
        [],
        ["Payment Method", "Count", "Percentage", "Total Revenue", "Average Order Value"]
      ];
      
      const totalCount = data.paymentMethodData.reduce((sum, item) => sum + item.value, 0);
      
      const summaryData = [
        ...summaryHeader,
        ...data.paymentMethodMetrics.map(item => {
          const percentage = (item.count / totalCount) * 100;
          
          return [
            item.method,
            item.count,
            `${percentage.toFixed(1)}%`,
            formatToRupees(item.revenue),
            formatToRupees(item.averageOrderValue)
          ];
        })
      ];
      
      // Add total row
      const totalRevenue = data.paymentMethodMetrics.reduce((sum, item) => sum + item.revenue, 0);
      const totalAvg = totalCount > 0 ? totalRevenue / totalCount : 0;
      
      summaryData.push(
        [],
        [
          "Total",
          totalCount,
          "100%",
          formatToRupees(totalRevenue),
          formatToRupees(totalAvg)
        ]
      );
      
      const sheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths for better readability
      sheet['!cols'] = [
        { wch: 20 }, // Payment method
        { wch: 10 }, // Count
        { wch: 15 }, // Percentage
        { wch: 20 }, // Total Revenue
        { wch: 20 }, // Average Order Value
      ];
      
      XLSX.utils.book_append_sheet(wb, sheet, "Payment Methods");
      
      // Create detailed transactions sheet by payment method - USING ALL TRANSACTIONS
      const transactionsHeader = [
        ...headerData,
        ["ALL Transactions by Payment Method"],
        [],
        ["Transaction ID", "Date", "Customer", "Items", "Total Value", "Payment Method"]
      ];
      
      const transactionsData = [
        ...transactionsHeader,
        ...data.allTransactions.map(item => [
          item.id,
          item.date,
          item.customer,
          item.items,
          formatToRupees(item.total),
          item.paymentMethod || "Cash"
        ])
      ];
      
      // Add summary by payment method at the end
      const cashTransactions = data.allTransactions.filter(t => (t.paymentMethod || "Cash") === "Cash");
      const onlineTransactions = data.allTransactions.filter(t => (t.paymentMethod || "Cash") === "Online");
      
      const cashTotal = cashTransactions.reduce((sum, t) => sum + t.total, 0);
      const onlineTotal = onlineTransactions.reduce((sum, t) => sum + t.total, 0);
      
      transactionsData.push(
        [],
        ["PAYMENT METHOD SUMMARY", "", "", "", "", ""],
        ["Cash Transactions", cashTransactions.length.toString(), "", "", formatToRupees(cashTotal), "Cash"],
        ["Online Transactions", onlineTransactions.length.toString(), "", "", formatToRupees(onlineTotal), "Online"],
        [],
        ["Total All Transactions", data.allTransactions.length.toString(), "", "", formatToRupees(cashTotal + onlineTotal), ""]
      );
      
      const transSheet = XLSX.utils.aoa_to_sheet(transactionsData);
      
      // Set column widths for better readability
      transSheet['!cols'] = [
        { wch: 20 }, // Transaction ID
        { wch: 15 }, // Date
        { wch: 25 }, // Customer
        { wch: 10 }, // Items
        { wch: 20 }, // Total Value
        { wch: 15 }, // Payment Method
      ];
      
      XLSX.utils.book_append_sheet(wb, transSheet, "All Transactions by Payment");
      
      // Generate file with specific name for payment method report
      const fileName = `payment-methods-all-transactions-${timeRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`Successfully exported all transactions payment method report to ${fileName}`);
      return true;
    } catch (err) {
      console.error("Error generating payment method report:", err);
      return false;
    }
  };

  return { 
    data, 
    isLoading, 
    error, 
    exportToPDF, 
    exportToExcel,
    exportProductData,
    exportTransactionData,
    exportPaymentMethodData,
    updateTransaction
  };
};
