import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export const exportToPDF = async (elementId: string, filename: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (error) {
    console.warn('Error generating PDF:', error);
  }
};

export const exportToExcel = (
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1',
): void => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const excelFileName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, excelFileName);
  } catch (error) {
    console.warn('Error generating Excel file:', error);
  }
};

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export const exportAuditLog = (entries: AuditEntry[]): void => {
  const data = entries.map(entry => ({
    'ID': entry.id,
    'Timestamp (IST)': entry.timestamp,
    'User': entry.user,
    'Action': entry.action,
    'Details': entry.details
  }));
  
  exportToExcel(data, `Audit_Log_${new Date().getTime()}.xlsx`, 'Audit Log');
};
