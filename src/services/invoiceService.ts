import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatToRupees } from "@/types/inventory";
import { toast } from "@/hooks/use-toast";

// Define a proper type for jsPDF with autoTable
interface TableColumn {
  header?: string;
  dataKey?: string;
}

// Properly define the extended jsPDF type with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: {
      startY?: number;
      head?: any[][];
      body: any[][];
      theme?: string;
      styles?: any;
      headStyles?: any;
      alternateRowStyles?: any;
      columnStyles?: any;
      margin?: any;
      tableWidth?: any;
      didDrawPage?: (data: any) => void;
    }) => any;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Constants for branding
const COMPANY_NAME = "StockEase POS";
const COMPANY_TAGLINE = "Smart Solutions for Smart Businesses";
const COMPANY_ADDRESS = "123 Business Street, Solapur, India";
const COMPANY_PHONE = "+91 9421612110";
const COMPANY_EMAIL = "contact@stockeasepos.com";
const COMPANY_WEBSITE = "Wardhaman Agency Pvt. Ltd.";

// Color scheme for invoice
const COLORS = {
  primary: "#3498db",    // Blue
  secondary: "#2ecc71",  // Green
  accent: "#f39c12",     // Orange
  text: "#2c3e50",       // Dark blue-gray
  lightGray: "#ecf0f1",  // Light gray
  mediumGray: "#bdc3c7", // Medium gray
  white: "#ffffff"
};

// Helper function to download the PDF using browser's built-in functionality
const downloadPDF = (pdf: jsPDF, filename: string) => {
  try {
    // Convert the PDF to a data URL and create a download link
    const pdfDataUri = pdf.output('datauristring');
    const link = document.createElement('a');
    link.href = pdfDataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error("Error in downloadPDF function:", error);
    return false;
  }
};

export const generateInvoicePDF = (saleData: any) => {
  try {
    console.log("Generating invoice with data:", saleData);
    
    // Create a new jsPDF instance with more reliable settings
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set up page dimensions
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const usableWidth = pageWidth - (margin * 2);
    
    // Add header with stylish background
    doc.setFillColor(COLORS.primary);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Add company logo/name with shadow effect
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(COLORS.white);
    doc.text(COMPANY_NAME, margin, 18);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_TAGLINE, margin, 26);
    
    // Add invoice title with highlight box
    doc.setFillColor(COLORS.accent);
    doc.roundedRect(pageWidth - 70, 10, 56, 20, 3, 3, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(COLORS.white);
    doc.text("INVOICE", pageWidth - 42, 22, { align: "center" });
    
    // Add company details section with top border
    doc.setDrawColor(COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);
    
    // Company contact info box with light background
    doc.setFillColor(COLORS.lightGray);
    doc.roundedRect(margin, 50, usableWidth / 2 - 5, 40, 2, 2, 'F');
    
    doc.setTextColor(COLORS.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("FROM:", margin + 5, 58);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_ADDRESS, margin + 5, 65);
    doc.text(`Phone: ${COMPANY_PHONE}`, margin + 5, 72);
    doc.text(`Email: ${COMPANY_EMAIL}`, margin + 5, 79);
    doc.text(`Website: ${COMPANY_WEBSITE}`, margin + 5, 86);
    
    // Invoice details box with light background
    doc.setFillColor(COLORS.lightGray);
    doc.roundedRect(margin + usableWidth / 2 + 5, 50, usableWidth / 2 - 5, 40, 2, 2, 'F');
    
    // Add invoice details
    const rightColumnX = margin + usableWidth / 2 + 10;
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE DETAILS:", rightColumnX, 58);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${saleData.id.slice(0, 8)}`, rightColumnX, 65);
    doc.text(`Date: ${new Date(saleData.timestamp).toLocaleDateString()}`, rightColumnX, 72);
    doc.text(`Time: ${new Date(saleData.timestamp).toLocaleTimeString()}`, rightColumnX, 79);
    
    // Payment method with icon-like indicator
    doc.setFont("helvetica", "bold");
    doc.text("Payment Method:", rightColumnX, 86);
    
    // Draw a small colored circle for payment method
    const paymentMethodColor = saleData.paymentMethod === 'cash' ? COLORS.secondary : COLORS.accent;
    doc.setFillColor(paymentMethodColor);
    doc.circle(rightColumnX + 30, 85, 2, 'F');
    
    doc.setFont("helvetica", "normal");
    doc.text(saleData.paymentMethod === 'cash' ? 'Cash' : 'Online', rightColumnX + 34, 86);
    
    // Add customer info with styled box
    const customerY = 100;
    doc.setFillColor(COLORS.lightGray);
    doc.roundedRect(margin, customerY - 8, usableWidth, 30, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary);
    doc.text("BILL TO:", margin + 5, customerY);
    
    doc.setTextColor(COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.text(saleData.customerName || "Walk-in Customer", margin + 5, customerY + 7);
    
    if (saleData.customerPhone) {
      doc.text(`Phone: ${saleData.customerPhone}`, margin + 5, customerY + 14);
    }
    
    if (saleData.customerEmail) {
      doc.text(`Email: ${saleData.customerEmail}`, margin + 5, customerY + (saleData.customerPhone ? 21 : 14));
    }
    
    // Line separator before items table
    const tableStartY = customerY + 30;
    doc.setDrawColor(COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, tableStartY, pageWidth - margin, tableStartY);
    
    // Items table title with background
    doc.setFillColor(COLORS.primary);
    doc.rect(margin, tableStartY + 2, usableWidth, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.white);
    doc.text("INVOICE ITEMS", pageWidth / 2, tableStartY + 7, { align: "center" });
    
    // Prepare table data
    const tableColumns = ["Item", "Price", "Qty", "Total"];
    const tableRows = saleData.items.map((item: any) => [
      item.name,
      formatToRupees(item.price),
      item.quantity,
      formatToRupees(item.price * item.quantity)
    ]);
    
    // Generate the table with enhanced styling
    try {
      doc.autoTable({
        startY: tableStartY + 12,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        styles: { 
          fontSize: 10,
          cellPadding: 4,
          lineColor: COLORS.mediumGray,
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [52, 152, 219], // COLORS.primary in RGB
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold' },
          1: { cellWidth: 'auto', halign: 'right' },
          2: { cellWidth: 'auto', halign: 'center' },
          3: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
        },
        didDrawPage: function(data) {
          // Add page numbers if multi-page
          doc.setFontSize(8);
          doc.setTextColor(COLORS.mediumGray);
          doc.text(
            `Page ${data.pageNumber} of ${doc.internal.pages.length - 1}`,
            pageWidth - margin,
            pageHeight - 10,
            { align: 'right' }
          );
        }
      });
    } catch (autoTableError) {
      console.error("Error in autoTable:", autoTableError);
      // Create a simple table as fallback
      doc.setTextColor(COLORS.text);
      doc.text("Items:", margin, tableStartY + 15);
      let yPos = tableStartY + 25;
      tableRows.forEach((row: any[], index: number) => {
        doc.text(`${index + 1}. ${row[0]} - ${row[1]} × ${row[2]} = ${row[3]}`, margin + 5, yPos);
        yPos += 10;
      });
    }
    
    // Get the final Y position after the table is drawn
    let finalY;
    try {
      finalY = doc.lastAutoTable.finalY + 10;
    } catch (error) {
      finalY = 200; // Fallback position if lastAutoTable is not available
    }
    
    // Add summary section with background
    doc.setFillColor(COLORS.lightGray);
    doc.roundedRect(pageWidth - 80, finalY, 66, 40, 2, 2, 'F');
    
    // Summary heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.primary);
    doc.text("PAYMENT SUMMARY", pageWidth - 47, finalY + 8, { align: "center" });
    
    // Summary details
    doc.setFontSize(10);
    doc.setTextColor(COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", pageWidth - 75, finalY + 16);
    doc.text(`${formatToRupees(saleData.subtotal)}`, pageWidth - 18, finalY + 16, { align: "right" });
    
    doc.text(`Discount (${saleData.discount}%):`, pageWidth - 75, finalY + 22);
    doc.text(`-${formatToRupees(saleData.discountAmount)}`, pageWidth - 18, finalY + 22, { align: "right" });
    
    doc.text(`GST (${saleData.vatRate}%):`, pageWidth - 75, finalY + 28);
    doc.text(`${formatToRupees(saleData.vatAmount)}`, pageWidth - 18, finalY + 28, { align: "right" });
    
    // Add a line before the total
    doc.setDrawColor(COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 75, finalY + 32, pageWidth - 18, finalY + 32);
    
    // Total with highlighted background
    doc.setFillColor(COLORS.primary);
    doc.roundedRect(pageWidth - 75, finalY + 33, 57, 7, 1, 1, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.white);
    doc.text("Total:", pageWidth - 70, finalY + 38);
    doc.text(`${formatToRupees(saleData.total)}`, pageWidth - 18, finalY + 38, { align: "right" });
    
    // Add a decorative bottom border
    doc.setDrawColor(COLORS.primary);
    doc.setLineWidth(1);
    doc.line(margin, finalY + 50, pageWidth - margin, finalY + 50);
    
    // Footer section
    const footerY = finalY + 60;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.text);
    doc.text("Payment Terms: Due on receipt", margin, footerY);
    
    // Thank you message with style
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.secondary);
    doc.text(`Thank you for your business!`, pageWidth/2, footerY + 8, { align: "center" });
    
    // Footer info
    doc.setTextColor(COLORS.mediumGray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated by ${COMPANY_NAME} • ${new Date().toLocaleDateString()}`, pageWidth/2, pageHeight - 10, { align: "center" });
    
    // Use the browser's built-in download functionality
    const filename = `invoice-${saleData.id.slice(0, 8)}.pdf`;
    const success = downloadPDF(doc, filename);
    
    if (success) {
      toast({
        title: "Success!",
        description: "Invoice PDF has been downloaded successfully.",
      });
      console.log("PDF successfully generated and downloaded");
      return true;
    } else {
      console.error("Failed to download PDF");
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  } catch (error) {
    console.error("Error in invoice service while generating PDF:", error);
    toast({
      title: "Error",
      description: "Failed to generate invoice PDF. Please try again.",
      variant: "destructive",
    });
    return false;
  }
};

// Updated function to send directly to WhatsApp without redirects
// Note: For true direct sending without opening the browser, a backend API would be needed
export const sendInvoiceToWhatsApp = (saleData: any) => {
  try {
    if (!saleData.customerPhone) {
      console.error("Customer phone number is missing");
      return false;
    }
    
    // Format phone number (remove any spaces, dashes, etc)
    let phoneNumber = saleData.customerPhone.replace(/\D/g, '');
    
    // Ensure phone number has country code
    if (!phoneNumber.startsWith('+')) {
      // If no country code, assume India (+91)
      if (!phoneNumber.startsWith('91')) {
        phoneNumber = '91' + phoneNumber;
      }
    } else {
      // Remove the + if it exists
      phoneNumber = phoneNumber.substring(1);
    }
    
    // Create beautifully formatted message
    const message = `
*${COMPANY_NAME}*
_${COMPANY_TAGLINE}_
---------------------------------------

📋 *INVOICE #${saleData.id.slice(0, 8)}*
📅 Date: ${new Date(saleData.timestamp).toLocaleDateString()}
⏰ Time: ${new Date(saleData.timestamp).toLocaleTimeString()}

👤 *Customer Details*
Name: ${saleData.customerName || "Walk-in Customer"}
${saleData.customerPhone ? `Phone: ${saleData.customerPhone}` : ''}
${saleData.customerEmail ? `Email: ${saleData.customerEmail}` : ''}

🛒 *Your Purchase*
${saleData.items.map((item: any, index: number) => 
  `${index + 1}. ${item.name} x ${item.quantity} = ${formatToRupees(item.price * item.quantity)}`
).join('\n')}

💰 *Payment Summary*
Subtotal: ${formatToRupees(saleData.subtotal)}
Discount (${saleData.discount}%): ${formatToRupees(saleData.discountAmount)}
GST (${saleData.vatRate}%): ${formatToRupees(saleData.vatAmount)}
*Total Amount: ${formatToRupees(saleData.total)}*

Thank you for your business! We appreciate your trust in ${COMPANY_NAME}.

For any queries, please contact us:
📞 ${COMPANY_PHONE}
📧 ${COMPANY_EMAIL}
🌐 ${COMPANY_WEBSITE}
`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
    
    console.log("WhatsApp message prepared with URL:", whatsappUrl);
    return true;
  } catch (error) {
    console.error("Error sending invoice to WhatsApp:", error);
    return false;
  }
};

// Updated function to send email with a better template
export const sendInvoiceByEmail = (saleData: any) => {
  try {
    if (!saleData.customerEmail) {
      console.error("Customer email is missing");
      return false;
    }
    
    // Create email subject
    const subject = `Invoice #${saleData.id.slice(0, 8)} from ${COMPANY_NAME}`;
    
    // Create email body with better formatting
    const body = `
Dear ${saleData.customerName || "Valued Customer"},

Thank you for your purchase from ${COMPANY_NAME}. Please find your invoice details below:

-----------------------------------------
INVOICE #${saleData.id.slice(0, 8)}
Date: ${new Date(saleData.timestamp).toLocaleDateString()}
Time: ${new Date(saleData.timestamp).toLocaleTimeString()}
-----------------------------------------

CUSTOMER INFORMATION:
Name: ${saleData.customerName || "Walk-in Customer"}
${saleData.customerPhone ? `Phone: ${saleData.customerPhone}` : ''}
${saleData.customerEmail ? `Email: ${saleData.customerEmail}` : ''}

PURCHASED ITEMS:
${saleData.items.map((item: any, index: number) => 
  `${index + 1}. ${item.name} x ${item.quantity} = ${formatToRupees(item.price * item.quantity)}`
).join('\n')}

PAYMENT SUMMARY:
Subtotal: ${formatToRupees(saleData.subtotal)}
Discount (${saleData.discount}%): ${formatToRupees(saleData.discountAmount)}
GST (${saleData.vatRate}%): ${formatToRupees(saleData.vatAmount)}
Total Amount: ${formatToRupees(saleData.total)}

Payment Terms: Due on receipt

Thank you for your business! We value your patronage.

Best regards,
The ${COMPANY_NAME} Team

Contact Information:
Phone: ${COMPANY_PHONE}
Email: ${COMPANY_EMAIL}
Website: ${COMPANY_WEBSITE}
Address: ${COMPANY_ADDRESS}
`;
    
    // Encode the subject and body for URL
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    
    // Create mailto URL
    const mailtoUrl = `mailto:${saleData.customerEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    
    // Open default email client
    window.location.href = mailtoUrl;
    
    console.log("Email prepared with URL:", mailtoUrl);
    return true;
  } catch (error) {
    console.error("Error sending invoice by email:", error);
    return false;
  }
};
