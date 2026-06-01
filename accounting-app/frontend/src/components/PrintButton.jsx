import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PrintButton({ title, headers, data, filename = 'report', summaryRows = [] }) {
  const handlePrint = () => {
    window.print();
  };

  const handlePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    // Add Arabic-friendly title using latin chars as fallback
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title || 'Report', doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString('ar-LY');
    doc.text(`Date: ${dateStr}`, 14, 25);

    // Prepare table data - reverse column order for RTL
    const reversedHeaders = [...headers].reverse();
    const reversedData = data.map(row => [...row].reverse());
    
    autoTable(doc, {
      startY: 30,
      head: [reversedHeaders],
      body: reversedData,
      styles: {
        fontSize: 9,
        halign: 'center',
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244]
      },
      margin: { top: 30, right: 14, bottom: 10, left: 14 }
    });

    if (summaryRows.length > 0) {
      const finalY = doc.lastAutoTable.finalY + 10;
      summaryRows.forEach((row, i) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${row.label}: ${row.value}`, 14, finalY + (i * 8));
      });
    }

    doc.save(`${filename}.pdf`);
  };

  return (
    <div className="flex gap-2 no-print">
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        طباعة
      </button>
      <button
        onClick={handlePDF}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        تصدير PDF
      </button>
    </div>
  );
}
