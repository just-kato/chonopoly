export interface PdfResource {
  id: string;
  title: string;
  filename: string; // filename inside public/pdfs/
  description?: string;
}

// Keyed by chapter id (e.g. "1-1"). Only chapters with resources appear here.
const resources: Record<string, PdfResource[]> = {
  "1-1": [
    {
      id: "1-1a",
      title: "Real Estate Professionals Infographic",
      filename: "1.1a Real Estate Professionals Infographic.pdf",
    },
  ],
  "1-2": [
    {
      id: "1-2a",
      title: "Types of Property Infographic",
      filename: "1.2a Types of Property Infographic.pdf",
    },
  ],
  "1-3": [
    {
      id: "1-3a",
      title: "Supply and Demand Infographic",
      filename: "1.3a Supply and Demand Infographic.pdf",
    },
  ],
  "4-3": [
    {
      id: "4-3a",
      title: "Depreciation Infographic",
      filename: "4.3a Depreciation Infographic.pdf",
    },
  ],
  "5-1": [
    {
      id: "5-1a",
      title: "Land, Real Estate and Real Property Infographic",
      filename: "5.1a Land Real Estate and Real Property Infographic.pdf",
    },
  ],
  "5-2": [
    {
      id: "5-2a",
      title: "Fixtures Infographic",
      filename: "5.2a Fixtures Infographic.pdf",
    },
    {
      id: "5-2b",
      title: "Personal Property Infographic",
      filename: "5.2b Personal Property Infographic.pdf",
    },
  ],
  "6-3": [
    {
      id: "6-3a",
      title: "Building Envelope Infographic",
      filename: "6.3a Building Envelope Infographic.pdf-65b9967525f47605d479f17e.pdf",
    },
    {
      id: "6-3b",
      title: "Floor Area Ratio Infographic",
      filename: "6.3b Floor Area Ratio Infographic.pdf-65b9968625f47605d479f477.pdf",
    },
  ],

};

export default resources;
