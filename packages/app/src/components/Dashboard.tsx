import React, { useState } from "react";
import mammoth from "mammoth";
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Use CDN for PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Dashboard: React.FC = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string>("");

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    setFileName(file.name);
    setFileText("");

    try {
      // PDF extraction
      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setFileText(text);
      } 
      // Word extraction
      else if (
        file.name.endsWith(".docx") ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setFileText(result.value);
      } 
      // Unsupported file
      else {
        setFileText("File type not supported for extraction.");
      }
    } catch (err) {
      console.error("Extraction error:", err);
      setFileText("Error extracting text.");
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setFileText("");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md p-6">
        <h2 className="text-xl font-bold mb-6">Dashboard</h2>
        <ul className="space-y-4">
          <li className="text-gray-700 hover:text-black cursor-pointer">
            Upload Resume
          </li>
          <li className="text-gray-700 hover:text-black cursor-pointer">
            Interview Practice
          </li>
          <li className="text-gray-700 hover:text-black cursor-pointer">
            Settings
          </li>
        </ul>
      </div>

      {/* Main content */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to your Dashboard
          </h1>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Logout
          </button>
        </div>

        {/* Upload box */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Upload your Resume
          </h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-2">
              Drag & drop your resume file here
            </p>

            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              id="resumeUpload"
              onChange={handleFileChange}
            />

            {!fileName ? (
              <label
                htmlFor="resumeUpload"
                className="px-4 py-2 bg-black text-white rounded cursor-pointer hover:bg-gray-800"
              >
                Choose File
              </label>
            ) : (
              <div className="flex justify-center space-x-4 mt-2">
                <label
                  htmlFor="resumeUpload"
                  className="px-4 py-2 bg-yellow-500 text-white rounded cursor-pointer hover:bg-yellow-600"
                >
                  Replace
                </label>
                <button
                  onClick={handleRemoveFile}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            )}

            {fileName && (
              <p className="mt-4 text-sm text-gray-700">Selected file: {fileName}</p>
            )}
          </div>
        </div>

        {/* Display extracted text */}
        {fileText && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-md font-medium text-gray-900 mb-2">
              Extracted Text:
            </h3>
            <div className="text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {fileText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
