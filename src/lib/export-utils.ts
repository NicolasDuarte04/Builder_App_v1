import { jsPDF } from 'jspdf';

interface Task {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  priority: string;
}

interface Phase {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  priority: string;
  category: string;
  tasks: Task[];
}

interface RoadmapData {
  title: string;
  description: string;
  phases: Phase[];
}

export function exportToCSV(roadmap: RoadmapData): void {
  const headers = ['Phase', 'Task', 'Description', 'Priority', 'Estimated Time (h)', 'Category'];
  const rows: string[][] = [];

  roadmap.phases.forEach((phase) => {
    // Add phase row
    rows.push([
      phase.title,
      '',
      phase.description,
      phase.priority,
      phase.estimatedTime.toString(),
      phase.category
    ]);

    // Add task rows
    phase.tasks.forEach((task) => {
      rows.push([
        '',
        task.title,
        task.description,
        task.priority,
        task.estimatedTime.toString(),
        ''
      ]);
    });
  });

  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${roadmap.title.replace(/[^a-z0-9]/gi, '_')}_roadmap.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(roadmap: RoadmapData): void {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const lineHeight = 7;
  const marginLeft = 20;
  const maxWidth = 170;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(roadmap.title, marginLeft, yPosition);
  yPosition += 10;

  // Description
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const descriptionLines = doc.splitTextToSize(roadmap.description, maxWidth);
  doc.text(descriptionLines, marginLeft, yPosition);
  yPosition += descriptionLines.length * lineHeight + 10;

  // Total time
  const totalTime = roadmap.phases.reduce((sum, phase) => sum + phase.estimatedTime, 0);
  doc.setFontSize(10);
  doc.text(`Total estimated time: ${totalTime} hours`, marginLeft, yPosition);
  yPosition += 15;

  // Phases
  roadmap.phases.forEach((phase, phaseIndex) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    // Phase header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Phase ${phaseIndex + 1}: ${phase.title}`, marginLeft, yPosition);
    yPosition += 8;

    // Phase details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Priority and time
    doc.text(`Priority: ${phase.priority} | Time: ${phase.estimatedTime}h | Category: ${phase.category}`, marginLeft, yPosition);
    yPosition += 6;

    // Phase description
    const phaseDescLines = doc.splitTextToSize(phase.description, maxWidth);
    doc.text(phaseDescLines, marginLeft, yPosition);
    yPosition += phaseDescLines.length * 5 + 5;

    // Tasks
    if (phase.tasks.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Tasks:', marginLeft + 5, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');

      phase.tasks.forEach((task, taskIndex) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        // Task title
        doc.text(`${taskIndex + 1}. ${task.title} (${task.estimatedTime}h)`, marginLeft + 10, yPosition);
        yPosition += 5;

        // Task description
        const taskDescLines = doc.splitTextToSize(task.description, maxWidth - 15);
        doc.setFontSize(9);
        doc.text(taskDescLines, marginLeft + 15, yPosition);
        doc.setFontSize(10);
        yPosition += taskDescLines.length * 4 + 3;
      });
    }

    yPosition += 10;
  });

  // Save the PDF
  doc.save(`${roadmap.title.replace(/[^a-z0-9]/gi, '_')}_roadmap.pdf`);
} 