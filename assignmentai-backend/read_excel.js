const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile(String.raw`c:\Users\Lenovo\OneDrive\Desktop\AssignmentAI\Student_Bulk_Upload_Template_Filled(1).xlsx`);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  console.log("Headers:", data[0]);
  console.log("Row 1:", data[1]);
} catch (e) {
  console.error(e);
}
