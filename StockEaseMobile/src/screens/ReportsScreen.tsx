import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { BarChart, PieChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { formatToRupees } from '../types/inventory';

const { width: screenWidth } = Dimensions.get('window');

const ReportsScreen = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    transactions: 0,
    averageSale: 0,
    profitMargin: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Calculate date range
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
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Fetch sales data
    const salesRef = collection(db, "sales");
    const q = query(
      salesRef,
      where("timestamp", ">=", Timestamp.fromDate(startDate)),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Process monthly sales
      const monthlySales: Record<string, number> = {};
      const productSales: Record<string, number> = {};
      const paymentMethods: Record<string, number> = {};
      
      let totalRevenue = 0;
      const transactionCount = snapshot.size;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp?.toDate();
        
        if (date) {
          const monthName = date.toLocaleString('default', { month: 'short' });
          monthlySales[monthName] = (monthlySales[monthName] || 0) + (data.total || 0);
        }
        
        totalRevenue += data.total || 0;
        
        // Process payment methods
        const method = data.paymentMethod || 'Cash';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        
        // Process products
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            if (item.name) {
              productSales[item.name] = (productSales[item.name] || 0) + (item.total || 0);
            }
          });
        }
      });

      // Format data for charts
      const formattedSalesData = Object.keys(monthlySales).map(month => ({
        name: month,
        sales: monthlySales[month],
      }));

      const formattedProductData = Object.keys(productSales)
        .map(name => ({
          name,
          population: productSales[name],
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          legendFontColor: '#7F7F7F',
          legendFontSize: 15,
        }))
        .sort((a, b) => b.population - a.population)
        .slice(0, 5);

      const formattedPaymentData = Object.keys(paymentMethods).map(method => ({
        name: method,
        population: paymentMethods[method],
        color: method === 'Cash' ? '#00C49F' : '#0088FE',
        legendFontColor: '#7F7F7F',
        legendFontSize: 15,
      }));

      setSalesData(formattedSalesData);
      setTopProducts(formattedProductData);
      setPaymentMethodData(formattedPaymentData);
      setSummary({
        totalSales: totalRevenue,
        transactions: transactionCount,
        averageSale: transactionCount > 0 ? totalRevenue / transactionCount : 0,
        profitMargin: 40.0, // Default profit margin
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [timeRange]);

  const generatePDFReport = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .summary { margin-bottom: 30px; }
              .chart-section { margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>StockEase Sales Report</h1>
              <p>Time Period: ${timeRange}</p>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="summary">
              <h2>Summary</h2>
              <p>Total Sales: ${formatToRupees(summary.totalSales)}</p>
              <p>Transactions: ${summary.transactions}</p>
              <p>Average Sale: ${formatToRupees(summary.averageSale)}</p>
              <p>Profit Margin: ${summary.profitMargin.toFixed(1)}%</p>
            </div>
            
            <div class="chart-section">
              <h2>Top Products</h2>
              <table>
                <tr><th>Product</th><th>Sales</th></tr>
                ${topProducts.map(product => 
                  `<tr><td>${product.name}</td><td>${formatToRupees(product.population)}</td></tr>`
                ).join('')}
              </table>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
      Alert.alert('Success', 'Report generated and shared successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity style={styles.exportButton} onPress={generatePDFReport}>
          <Ionicons name="download-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={timeRange}
              onValueChange={setTimeRange}
              style={styles.picker}
            >
              <Picker.Item label="Past Week" value="week" />
              <Picker.Item label="Past Month" value="month" />
              <Picker.Item label="Past Quarter" value="quarter" />
              <Picker.Item label="Past Year" value="year" />
            </Picker>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Sales</Text>
            <Text style={styles.summaryValue}>{formatToRupees(summary.totalSales)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Transactions</Text>
            <Text style={styles.summaryValue}>{summary.transactions}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Average Sale</Text>
            <Text style={styles.summaryValue}>{formatToRupees(summary.averageSale)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Profit Margin</Text>
            <Text style={styles.summaryValue}>{summary.profitMargin.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Monthly Sales Chart */}
        {salesData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Monthly Sales</Text>
            <BarChart
              data={{
                labels: salesData.map(item => item.name),
                datasets: [{
                  data: salesData.map(item => item.sales),
                }],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              verticalLabelRotation={30}
              style={styles.chart}
            />
          </View>
        )}

        {/* Top Products Chart */}
        {topProducts.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Top Products</Text>
            <PieChart
              data={topProducts}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Payment Methods Chart */}
        {paymentMethodData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Payment Methods</Text>
            <PieChart
              data={paymentMethodData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}
      </ScrollView>
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
  exportButton: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    padding: 10,
  },
  content: {
    flex: 1,
  },
  timeRangeContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  picker: {
    height: 50,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default ReportsScreen;