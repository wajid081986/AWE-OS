/**
 * Shared SEO content (about text) for tool pages.
 * Imported by both the React page components (for the visible UI)
 * and by scripts/prerender.js (to inject into static HTML for crawlers).
 *
 * Keys match tool slugs from toolRegistry.js.
 */

export const TOOL_ABOUT = {
  'merge-pdf': {
  "description": "AWE-OS Merge PDF is a free, browser-based tool specially designed for Indian users to combine multiple PDF documents into a single file with ease. Ideal for professionals, students, and everyday users, this tool is perfect for merging crucial documents such as contract annexures, GST invoices, research paper appendices, and multi-chapter reports. By using this tool, you can eliminate the hassle of managing multiple PDFs, ensuring a streamlined process when submitting important documents that often require a unified presentation, such as those for government submissions or business proposals.",
  "features": [
    "Instant PDF Merging: Combine multiple PDF files into one in seconds without any delays.",
    "Zero Server Uploads: Your files remain secure as no data is uploaded to external servers.",
    "User-Friendly Interface: Designed for ease of use, making it accessible for all age groups and tech skills.",
    "Compatible with All Browsers: Use the tool on any popular web browser without the need for downloads.",
    "No Installation Required: Access the tool directly from your browser without needing to install additional software.",
    "Support for Large Files: Merge multiple PDFs regardless of file size, perfect for comprehensive reports or extensive documentation."
  ],
  "useCases": [
    "For Indian professionals preparing tender documents, AWE-OS Merge PDF allows you to combine technical specifications, financial bids, and compliance certificates into one cohesive file, making it easier to submit to government agencies or corporate clients.",
    "Students can utilize the merging tool to compile research papers, thesis chapters, and project reports into a single PDF file, simplifying the submission process for academic evaluations and ensuring a polished presentation.",
    "Businesses can merge multiple GST invoices and purchase orders into one document for streamlined record-keeping and tax filing, reducing the chances of errors during audits.",
    "Event planners can combine contracts, itineraries, and vendor agreements into a single PDF, ensuring that all stakeholders have access to the necessary information in an organized manner."
  ],
  "howToUse": [
    "Step 1: Open the AWE-OS Merge PDF tool by visiting https://www.awe-os.com/tools/merge-pdf in your web browser.",
    "Step 2: Click on the 'Upload Files' button to select the PDF documents you want to merge from your device.",
    "Step 3: Ensure the files are in the desired order by dragging and dropping them in the tool's interface.",
    "Step 4: Once you're satisfied with the arrangement, click on the 'Merge PDF' button to start the process.",
    "Step 5: After merging, download the combined PDF file to your device and use it as needed."
  ],
  "whyUseUs": [
    "AWE-OS Merge PDF offers a unique advantage for Indian users by ensuring complete privacy and data security, as all processing happens in the browser without uploading files to servers, essential for sensitive business and personal documents.",
    "The tool's seamless integration with the Indian digital landscape makes it a perfect fit for local users who require quick and efficient solutions for managing PDFs, especially when dealing with official paperwork that often needs to adhere to specific formats.",
    "With no costs involved and user-friendly features, AWE-OS Merge PDF stands out as an ideal choice for students and professionals alike, facilitating easier document management without the need for expensive software or complicated processes."
  ],
  "faqs": [
    {
      "q": "Is my data safe when using AWE-OS Merge PDF?",
      "a": "Yes, your data is completely safe when using AWE-OS Merge PDF. Since our tool works entirely in your browser, there are no server uploads, eliminating any risk of data breaches. Your files are processed locally on your device, ensuring that your sensitive documents remain private and secure."
    },
    {
      "q": "Can I merge large PDF files with this tool?",
      "a": "Absolutely! AWE-OS Merge PDF is designed to handle large files efficiently. Whether you are merging extensive reports, multi-part documents, or multiple invoices, our tool can manage the size without compromising speed or quality. This feature is particularly useful for Indian businesses that need to consolidate detailed documents for compliance and record-keeping."
    },
    {
      "q": "Do I need to create an account to use the Merge PDF tool?",
      "a": "No, you do not need to create an account to use AWE-OS Merge PDF. The tool is completely free and accessible without any sign-up process. Simply visit the website, upload your files, and start merging right away. This ease of access makes it convenient for users who require quick solutions without the hassle of account management."
    }
  ]
},

  'bmi-calculator': {
    description: "AWE-OS BMI Calculator is a free online tool that instantly computes your Body Mass Index from height and weight inputs in either metric (cm/kg) or imperial (ft/lb) units. It is designed for Indian and South Asian users who need both the standard WHO BMI thresholds and the stricter Asian-specific thresholds recommended by the ICMR (Indian Council of Medical Research) and Asia-Pacific clinical guidelines, which set the overweight cutoff at BMI 23 rather than the Western standard of 25. The calculator uses the WHO formula — weight in kg divided by height in metres squared — and displays results with a colour-coded scale showing Underweight, Normal weight, Overweight, and Obese categories. Imperial inputs are automatically converted to metric before calculation. BMI is a widely used population screening tool, but does not differentiate between fat mass and muscle mass, nor account for abdominal obesity patterns common in South Asians. Always consult a qualified doctor for personalised health assessment.",
    features: [
      "Supports both metric (cm, kg) and imperial (ft, in, lb) unit inputs with automatic conversion",
      "Displays both WHO global thresholds and ICMR Asian-specific thresholds side by side",
      "Colour-coded BMI scale: Underweight (<18.5), Normal (18.5–22.9), Overweight (23–27.4), Obese (≥27.5) for Asian populations",
      "Instant calculation with no page reload — results appear as you type",
      "Includes health guidance notes based on ICMR and Asia-Pacific clinical guidelines",
      "Works offline once loaded — no internet connection needed for calculation",
    ],
    useCases: [
      "Individuals tracking their weight and health status for general awareness and annual health check-ups",
      "Fitness enthusiasts and gym-goers monitoring progress alongside their workout and diet programmes",
      "Parents and teachers checking BMI-for-age percentiles for children in school health programmes",
      "Healthcare students and professionals needing a quick reference tool for patient screening discussions",
    ],
    howToUse: [
      "Select your preferred unit system — Metric (cm and kg) or Imperial (feet, inches, and pounds)",
      "Enter your height in the appropriate fields — for metric, enter centimetres; for imperial, enter feet and inches separately",
      "Enter your weight — kilograms for metric, or pounds for imperial",
      "Click 'Calculate BMI' to see your result with the category label and colour indicator",
      "Review both the WHO and ICMR thresholds shown below your result to understand the Indian-specific risk levels",
    ],
    whyUseUs: [
      "India-specific ICMR thresholds shown alongside global WHO thresholds — most BMI calculators only show Western cutoffs, missing the clinically relevant 23 overweight threshold for South Asians",
      "100% browser-based and private — your height and weight data is never sent to any server and is discarded when you close the tab",
      "Free, instant, and mobile-friendly with no account required — use it on any device without installation",
    ],
    faqs: [
      { q: "What is a healthy BMI for Indians?", a: "According to ICMR and Asia-Pacific guidelines, a BMI of 18.5–22.9 is considered Normal weight for South Asians. A BMI of 23–27.4 is classified as Overweight, and 27.5 or above is Obese. These thresholds are stricter than the global WHO cutoffs (Overweight at 25, Obese at 30) because research shows Indians carry more visceral (abdominal) fat at lower BMI values, which increases the risk of diabetes and cardiovascular disease at a lower body weight than in Western populations." },
      { q: "Does BMI accurately reflect health for all body types?", a: "BMI has recognised limitations. It does not differentiate between fat mass and lean muscle mass, so athletes with high muscle mass may be misclassified as Overweight or Obese. It also does not account for fat distribution — waist circumference and waist-to-hip ratio are additional important indicators, especially for Indians who tend to accumulate abdominal fat. BMI should be used as one of several screening indicators alongside blood glucose, lipid panel, blood pressure, and waist measurement." },
      { q: "Is this tool a substitute for medical advice?", a: "No. The AWE-OS BMI Calculator is intended for general health awareness and informational purposes only. It is not a medical device and cannot diagnose any health condition. If you are concerned about your weight, BMI category, or overall health, please consult a qualified doctor, dietitian, or registered nutritionist who can evaluate your complete health profile." },
    ],
  },

  'sip-calculator': {
    description: "AWE-OS SIP Calculator is a free online tool for Indian investors to estimate the future value of Systematic Investment Plan (SIP) contributions in mutual funds. It supports three calculation modes — standard SIP (monthly investment to corpus), Lumpsum (one-time investment growth), and Goal-Based (required monthly SIP to reach a target amount) — making it suitable for a wide range of investment planning scenarios from retirement savings to children's education funds. The calculator uses the standard compound interest formula endorsed by AMFI (Association of Mutual Funds in India): FV = P × [(1 + r)^n – 1] ÷ r × (1 + r), where monthly compounding reflects rupee-cost averaging. Results include Total Invested, Estimated Returns, and Final Corpus alongside a year-by-year growth chart and a rate sensitivity table comparing outcomes at 8%, 12%, 15%, and 18% annual returns. SIP projections assume constant annual returns and full reinvestment. As mandated by SEBI, mutual fund investments are subject to market risks and past performance does not guarantee future returns. Consult a SEBI-registered investment advisor before making investment decisions.",
    features: [
      "Three calculation modes: SIP (monthly to corpus), Lumpsum (one-time growth), and Goal-Based (target-to-monthly SIP)",
      "Year-by-year corpus growth chart with area visualization for easy trend understanding",
      "Rate sensitivity table comparing results at 8%, 12%, 15%, and 18% annual returns simultaneously",
      "Displays Total Invested, Estimated Returns, and Final Corpus in Indian number format (lakhs/crores)",
      "Supports investment horizons from 1 to 40 years and monthly amounts from ₹500 upward",
      "SEBI-compliant disclaimer and AMFI-aligned formula for accurate mutual fund projections",
    ],
    useCases: [
      "Salaried professionals planning monthly SIP contributions for retirement corpus calculation over 20–30 year horizons",
      "Parents calculating the monthly SIP amount required today to fund their child's higher education in 15–18 years",
      "First-time investors in India comparing equity mutual fund SIP growth against FD and PPF alternatives",
      "NRIs planning lumpsum investments in Indian mutual funds through NRE/NRO accounts for wealth creation",
    ],
    howToUse: [
      "Select your calculation mode: 'SIP' for monthly investment to corpus, 'Lumpsum' for one-time investment, or 'Goal' to find required monthly SIP for a target",
      "Enter the relevant amount — monthly investment for SIP, principal for Lumpsum, or target corpus for Goal mode",
      "Set the investment duration in years and the expected annual return rate (historical long-term equity mutual fund returns in India: 12–15%)",
      "Click 'Calculate' to see the corpus breakdown with Total Invested, Returns Earned, and Final Corpus",
      "Review the year-by-year growth chart and rate sensitivity table to understand how different return scenarios affect your corpus",
    ],
    whyUseUs: [
      "Three calculation modes in one tool — most SIP calculators only offer standard SIP; our Goal-Based mode helps you work backwards from a target corpus, which is essential for goal-based financial planning",
      "Rate sensitivity table shows corpus at 8%, 12%, 15%, and 18% simultaneously — no need to recalculate manually for different market scenarios",
      "India-first design: Indian number formatting (₹ lakhs and crores), AMFI-aligned formula, SEBI-mandated disclaimers, and a return range calibrated to Indian mutual fund historical data",
    ],
    faqs: [
      { q: "What annual return rate should I use for SIP calculation in India?", a: "For long-term equity mutual fund SIPs (10+ years), Indian markets have historically delivered 12–15% CAGR. Large-cap funds have averaged 10–12%, mid-cap funds 13–16%, and small-cap funds 14–18% over 15-year periods, though with higher volatility. Conservative investors can use 8–10% for debt-oriented or balanced funds. It is prudent to run projections at 10%, 12%, and 15% to understand the range of outcomes, which is why our rate sensitivity table shows all four scenarios simultaneously." },
      { q: "Is SIP better than a Fixed Deposit (FD) for long-term savings in India?", a: "For long-term goals (7+ years), equity mutual fund SIPs have historically outperformed FDs significantly. A 15-year SIP at 12% grows more than twice as fast as an FD at 6.5–7%. However, SIP returns are market-linked and not guaranteed, while FD returns are fixed and guaranteed by the bank (up to ₹5 lakh per bank per depositor under DICGC insurance). SIPs are suitable for wealth creation goals where you can tolerate short-term market volatility. FDs are better for capital preservation and short-term goals." },
      { q: "How much SIP should I start with as a beginner in India?", a: "SEBI and AMFI allow SIP investments starting from ₹100–₹500 per month, depending on the fund. A common beginner rule is to invest at least 20% of your monthly income in SIPs. For example, on a ₹50,000 monthly salary, a ₹10,000 SIP in a diversified equity mutual fund started at age 25 and continued for 30 years at 12% annual returns would grow to approximately ₹3.5 crore — nearly 29× the total invested amount of ₹36 lakh. Start with whatever you can afford consistently and increase by 10–15% every year using the Step-Up SIP feature offered by most AMCs." },
    ],
  },

  'pdf-editor': {
    whatIsIt: 'AWE-OS PDF Editor is a free browser-based tool that lets you edit, annotate, and sign PDF files without uploading to any server. Open any PDF, add text boxes, draw freehand, highlight passages, insert rectangles, circles, arrows, sticky notes, images, and hand-drawn or typed signatures — then download the finished file instantly. Everything runs in your browser; your documents never leave your device.',
    howToUse: [
      'Click "Open PDF" or drag your PDF file into the editor — all pages are rendered as a scrollable canvas',
      'Select an annotation tool from the toolbar: Text, Draw, Highlight, Rectangle, Circle, Arrow, Line, Sticky Note, Image, or Signature',
      'Click or drag on any page to place or draw your annotation; drag to reposition, use corner handles to resize',
      'Use the page panel on the left to reorder, rotate, or delete individual pages',
      'Click "Download PDF" to save the fully annotated PDF to your device — no account required',
    ],
    whyUseUs: [
      '100% browser-based — your PDF is never uploaded to any server, keeping sensitive documents fully private',
      '10 annotation tools including freehand draw, highlight, sticky notes, shapes, arrows, and signature capture',
      'Drag, resize, and delete any annotation after placing it — full edit control at every step',
      'Undo/redo up to 20 steps so you can experiment without fear of making permanent mistakes',
      'Free with no watermarks, no file size limits, and no account registration required',
    ],
    faqs: [
      { q: 'Is the PDF Editor free to use?', a: 'Yes. AWE-OS PDF Editor is completely free — no account, no watermark, and no usage limits.' },
      { q: 'Is my PDF file safe when editing online?', a: 'Yes. All editing happens locally in your browser using JavaScript (PDF.js and pdf-lib). Your PDF is never uploaded to any server and is permanently discarded when you close the tab. This makes it safe to use with Aadhaar cards, bank statements, salary slips, contracts, and other sensitive documents.' },
      { q: 'Can I sign a PDF with this tool?', a: 'Yes. Select the Signature tool, then either draw your signature with a mouse or touchscreen, or type your name and choose a script font. Place the signature anywhere on the page, resize it, and download. The signature is embedded as an image in the final PDF.' },
      { q: 'Does the PDF Editor work on mobile?', a: 'Yes. The editor is responsive and works on Android and iOS in Chrome, Firefox, Safari, and Edge. Touch drawing and tap-to-place annotations are fully supported.' },
      { q: 'Can I reorder or delete pages?', a: 'Yes. The left sidebar shows thumbnail previews of all pages. Drag thumbnails to reorder pages, or use the rotate and delete icons on each thumbnail. Page changes are reflected in the downloaded PDF.' },
    ],
  },

  'compress-pdf': {
  "description": "AWE-OS Compress PDF is a free, browser-based tool tailored for Indian users, enabling them to easily reduce the size of their PDF documents without any server uploads. This is particularly beneficial for individuals who frequently encounter file size restrictions on government portals, such as the income tax portal where file uploads are limited to 2MB. Additionally, students applying for university admissions often need to submit documents under strict size limits, and professionals sharing documents via email or WhatsApp frequently face the 25MB cap. Our tool ensures that these users can compress their PDFs effortlessly, maintaining document quality while complying with these size constraints.",
  "features": [
    "No File Uploads: Your files are processed locally, ensuring privacy and security.",
    "Multiple Compression Levels: Choose from Medium and High compression options based on your needs.",
    "User-Friendly Interface: Simple drag-and-drop functionality makes it easy for anyone to use.",
    "Fast Processing: Compress your PDFs quickly without waiting for uploads or downloads.",
    "Quality Retention: Maintain the integrity and readability of your documents post-compression.",
    "Completely Free: Enjoy unlimited usage without any hidden fees or subscriptions."
  ],
  "useCases": [
    "Indian businesses often need to submit various documents for GST filings. With AWE-OS Compress PDF, they can reduce large invoices and receipts to meet the 2MB file size requirement on the government portal, ensuring compliance and timely submissions.",
    "Students applying for universities in India must upload documents like mark sheets and certificates which often exceed size limits. By using our tool, they can compress these PDFs, making the application process smoother and hassle-free.",
    "Freelancers and professionals frequently send proposals and contracts via email. By compressing these documents to stay within the 25MB limit, they can ensure their communications are seamless and professional.",
    "Individuals sharing family documents or educational materials via WhatsApp can use our tool to compress larger PDFs, allowing for easy sharing without the frustration of size restrictions."
  ],
  "howToUse": [
    "Step 1: Open the AWE-OS Compress PDF tool on your browser.",
    "Step 2: Click on 'Select PDF' or simply drag and drop your PDF file into the designated area.",
    "Step 3: Choose your desired compression level; Medium is generally recommended for standard documents, while High is best for files that need significant size reduction.",
    "Step 4: Click on the 'Compress' button and wait for the tool to process your PDF.",
    "Step 5: Once the compression is complete, download your reduced-size PDF and use it as needed."
  ],
  "whyUseUs": [
    "Our tool is specifically designed for Indian users, addressing local challenges such as government document size restrictions, ensuring you can always submit your files without hassle.",
    "AWE-OS Compress PDF is entirely free, allowing you to optimize your documents without worrying about costs, making it an accessible solution for students and professionals alike.",
    "With a focus on user experience, our intuitive interface and quick processing times mean you can get your PDFs compressed and ready in no time, enhancing your productivity."
  ],
  "faqs": [
    {
      "q": "Is there a limit to how many PDFs I can compress?",
      "a": "No, AWE-OS Compress PDF is completely free to use with no limits on the number of PDFs you can compress. This makes it an ideal tool for students, professionals, and businesses in India who frequently need to manage multiple document submissions."
    },
    {
      "q": "Will compressing my PDF affect its quality?",
      "a": "Our tool is designed to retain the quality of your PDFs even after compression. While some minor loss in quality may occur with high compression settings, the readability and essential features of your document will remain intact, making it suitable for all types of documents."
    },
    {
      "q": "Can I use this tool on my mobile device?",
      "a": "Yes, AWE-OS Compress PDF is a browser-based tool, which means you can access it from any device with an internet connection, including mobile phones and tablets. This flexibility allows you to compress your PDFs on the go, whether you're a student submitting applications or a business professional managing documents."
    }
  ]
},

  'jpg-to-pdf': {
  "description": "AWE-OS JPG to PDF is a user-friendly online tool designed for Indian users, allowing them to effortlessly convert JPEG and PNG images into a single PDF document directly in their browser. This tool is particularly valuable for students and professionals who need to compile multiple scanned documents, such as Aadhaar cards, PAN cards, and mark sheets, into one cohesive file. Additionally, it's perfect for combining images of handwritten notes for college submissions or consolidating receipts for expense reporting and GST documentation. With AWE-OS, creating a professional-looking PDF is quick, easy, and entirely free.",
  "features": [
    "Easy to use interface that allows quick conversion without the need for downloads, saving time and effort.",
    "Supports multiple file formats including JPEG and PNG, accommodating a wide range of image types.",
    "Allows users to reorder images by dragging and dropping, ensuring the final PDF is structured correctly.",
    "Provides options for selecting page sizes, such as A4 or Letter, catering to specific document requirements.",
    "No file size limits, enabling users to upload large batches of images for conversion without hassle.",
    "Completely free to use, making it accessible for all users in India, whether for personal or professional needs."
  ],
  "useCases": [
    "Students can use AWE-OS JPG to PDF to combine their scanned mark sheets and project notes into a single PDF for easy submission to universities, ensuring all documents are together and neatly organized.",
    "Small business owners can consolidate multiple image receipts into one PDF for GST documentation, simplifying their accounting process and making it easier to track expenses during tax filing.",
    "Professionals may need to convert photos of handwritten meeting notes into a PDF to share with colleagues, allowing for effective collaboration without the need for physical paperwork.",
    "Individuals applying for loans or government services can combine important documents such as Aadhaar and PAN cards into a single PDF, making submission to banks or government offices seamless."
  ],
  "howToUse": [
    "Step 1: Click the 'Add Images' button or simply drag and drop your JPEG, JPG, or PNG files into the conversion tool. You can upload multiple files at once.",
    "Step 2: Once your images are uploaded, you can easily reorder them by dragging the thumbnails to your desired sequence, ensuring they appear in the correct order in the final PDF.",
    "Step 3: Select the page size that suits your needs, whether it's A4 for standard documents or other sizes, making it flexible for various requirements.",
    "Step 4: After organizing your images and selecting the page size, click on the 'Convert' button to start the process. The tool will compile your images into a single PDF document.",
    "Step 5: Once the conversion is complete, download your PDF file to your device for easy sharing and storage."
  ],
  "whyUseUs": [
    "AWE-OS is tailored for Indian users, offering a completely free tool that eliminates the need for software downloads, saving both time and storage space.",
    "Our platform supports a wide range of image formats and allows easy manipulation of files, making it perfect for students, business owners, and anyone needing to compile documents efficiently.",
    "With AWE-OS, you can trust that your documents are processed securely in your browser, ensuring privacy and safety while converting important files."
  ],
  "faqs": [
    {
      "q": "Is there a limit on the number of images I can upload?",
      "a": "No, AWE-OS JPG to PDF does not impose any limits on the number of images you can upload. You can combine as many JPEG and PNG files as you need into a single PDF document, making it ideal for large projects like compiling multiple receipts or documents for GST filing."
    },
    {
      "q": "What image formats are supported for conversion?",
      "a": "AWE-OS JPG to PDF primarily supports JPEG and PNG formats. This flexibility allows users to work with various types of images, whether they are scanned documents or photos, ensuring your needs are met for any conversion task."
    },
    {
      "q": "Is this tool really free to use?",
      "a": "Yes, AWE-OS JPG to PDF is completely free to use. There are no hidden fees or charges. This makes it an ideal choice for students, small business owners, and anyone needing to convert images to PDF without worrying about costs."
    }
  ]
},

  'pdf-to-jpg': {
  "description": "AWE-OS PDF to JPG is a powerful online tool designed specifically for Indian users, enabling them to effortlessly convert PDF files into high-quality JPEG images. Whether you're a student needing to share lecture notes, a small business owner looking to convert product brochures, or a professional aiming to create engaging presentations, this tool is tailored for you. With no installation required and instant conversion directly in your browser, it’s perfect for those who value convenience. Plus, with the rising use of digital communication in India, converting PDFs to JPGs makes sharing content via WhatsApp or social media platforms more accessible and visually appealing, all free of charge.",
  "features": [
    "Instant conversion without any software installation, saving time and effort for Indian users.",
    "Browser-based tool that works on any device, allowing users to convert PDFs on-the-go.",
    "High-quality output options to ensure clarity and detail for images used in business presentations.",
    "Simple drag-and-drop interface, making it user-friendly for individuals of all tech levels.",
    "No registration or hidden fees, ensuring a completely free experience, aligning with the needs of small businesses and freelancers in India.",
    "Supports a wide range of PDF file sizes, accommodating everything from simple documents to complex catalogs."
  ],
  "useCases": [
    "A small business owner in Mumbai can convert their product catalog PDF into JPG images to share on social media, enhancing visibility without the hassle of complex software.",
    "Students preparing for online submissions can convert their lecture slides into JPEGs for easier sharing with classmates via messaging apps like WhatsApp, making collaboration seamless.",
    "A graphic designer in Bangalore can use the tool to extract images from a PDF portfolio, allowing for quick adjustments and easy sharing with potential clients.",
    "Event organizers can convert event flyers from PDF to JPG to distribute visually appealing images via email and social media, ensuring maximum outreach and engagement."
  ],
  "howToUse": [
    "Step 1: Click on the 'Select PDF' button or simply drag and drop your PDF file into the designated area on the tool's webpage.",
    "Step 2: Once the file is uploaded, choose your preferred output image quality. Select 'High' for the best clarity, ideal for print or presentation use, or 'Medium' for everyday sharing.",
    "Step 3: After setting the quality, click on the 'Convert to JPG' button to start the conversion process.",
    "Step 4: Wait a few moments as the tool processes your PDF, converting each page into a separate JPG image file.",
    "Step 5: Once the conversion is complete, download the JPEG files directly to your device, ready for use in your projects or sharing."
  ],
  "whyUseUs": [
    "Our tool is designed with the Indian user in mind, offering a straightforward and efficient solution for converting PDFs to images without the need for advanced technical skills.",
    "By providing services at no cost, we empower small business owners and freelancers in India to enhance their digital content without incurring additional expenses.",
    "With a mobile-friendly interface, you can convert PDF files into JPGs anytime and anywhere, making it ideal for users in fast-paced environments like urban India."
  ],
  "faqs": [
    {
      "q": "Is there a limit on the file size I can upload?",
      "a": "Yes, while our tool supports a wide range of PDF sizes, for optimal performance, we recommend keeping your files under 10 MB. If your PDF is larger, consider splitting it into smaller parts before conversion."
    },
    {
      "q": "Can I convert multiple PDF files at once?",
      "a": "Currently, our tool allows one PDF file conversion at a time. However, you can easily repeat the process for multiple files. This ensures each PDF is converted accurately and maintains high quality."
    },
    {
      "q": "What should I do if the conversion fails?",
      "a": "If your conversion doesn't succeed, please check the file format and size. Ensure your PDF is not password-protected, as this may hinder the conversion. If issues persist, try using a different browser or clear your cache before attempting again."
    }
  ]
},

  'word-to-pdf': {
  "description": "The AWE-OS Word to PDF tool is a free and user-friendly solution for converting .docx Microsoft Word documents into PDF format directly from your browser. In India, where job applications often necessitate PDF resumes and government forms require PDF submissions, this tool is invaluable. It enables students to submit university assignments in the required format and professionals to create client-facing documents that maintain their original formatting. With no need for Microsoft Office installation, users can conveniently convert their documents online, ensuring compatibility across different devices and operating systems. This is especially beneficial for Indian users looking to streamline their document management processes while saving time and effort.",
  "features": [
    "No installation required: Convert files directly in your browser without needing Microsoft Office, saving on software costs.",
    "Fast processing: Enjoy quick conversions with minimal wait time, helping you meet deadlines without stress.",
    "High-quality output: The tool preserves the formatting of your original document, ensuring that all fonts, images, and layouts remain intact.",
    "User-friendly interface: Designed for Indian users, the tool is intuitive and easy to navigate, making document conversion accessible to everyone.",
    "Mobile-friendly: Use the tool on any device, whether you're at home or on the go, making it perfect for busy professionals and students.",
    "Free to use: No hidden charges or subscription fees, allowing users to convert as many documents as needed without worrying about costs."
  ],
  "useCases": [
    "When applying for jobs in India, having a professional PDF resume is essential. Many employers specifically request resumes in PDF format to ensure that the formatting remains consistent across different devices. Our tool allows applicants to convert their Word documents easily, making a strong first impression.",
    "Students often face strict submission guidelines for university assignments. Many institutions require documents to be submitted in PDF format. With the AWE-OS Word to PDF tool, students can quickly convert their assignments to meet these requirements, ensuring their hard work is presented correctly.",
    "Businesses in India frequently need to send client-facing documents, such as proposals and reports, in PDF format to maintain a professional appearance. By using our tool, companies can convert Microsoft Word documents to PDF seamlessly, preserving the original formatting and enhancing communication with clients.",
    "Government forms in India often require PDF uploads for compliance. Whether you are submitting tax forms, applications for licenses, or other official documents, our tool simplifies the process by allowing you to convert Word files to PDF easily, ensuring compliance with regulations."
  ],
  "howToUse": [
    "Step 1: Click on the 'Select Word File' button or simply drag and drop your .docx file into the designated area on the tool's page.",
    "Step 2: The tool will automatically begin processing your document without requiring any further input or settings from you.",
    "Step 3: Wait a few moments while the conversion takes place. The speed of conversion may vary based on your internet connection and file size.",
    "Step 4: Once the conversion is complete, a download link for your new PDF file will appear on the screen.",
    "Step 5: Click the download link to save the PDF file to your device and begin using it for your intended purpose."
  ],
  "whyUseUs": [
    "Our tool is specifically designed for Indian users, understanding the unique needs of job seekers, students, and professionals who require reliable document conversions without the hassle of software installations.",
    "With a focus on maintaining quality and formatting, our service ensures that your documents look professional and polished when converted to PDF format, meeting the standards expected in Indian business and educational environments.",
    "As a completely free tool, we offer unlimited conversions, making it the perfect solution for individuals and businesses alike who may need to convert multiple documents regularly without incurring additional costs."
  ],
  "faqs": [
    {
      "q": "Is the AWE-OS Word to PDF tool really free?",
      "a": "Yes, the AWE-OS Word to PDF tool is completely free to use. There are no hidden charges or subscription fees, allowing you to convert as many documents as you need without worrying about costs. This is especially beneficial for Indian students and professionals who may require frequent conversions for job applications or assignments."
    },
    {
      "q": "What file formats can I convert using this tool?",
      "a": "Currently, the AWE-OS Word to PDF tool allows you to convert .docx Microsoft Word files into PDF format. This is the most common format used in job applications and educational submissions in India, ensuring compatibility with most systems and devices."
    },
    {
      "q": "How long does the conversion process take?",
      "a": "The conversion process is typically very fast, usually taking just a few seconds to a couple of minutes, depending on the size of your document and your internet connection speed. This quick turnaround is ideal for Indian users who are often working under tight deadlines, such as students submitting assignments or job seekers preparing applications."
    }
  ]
},

  'split-pdf': {
  "description": "AWE-OS Split PDF is an innovative online tool specifically designed for Indian users looking to manage their PDF documents efficiently. This tool allows you to extract specific pages or ranges from a PDF file and save them as a new, smaller PDF document directly in your browser. Whether you're a student needing to share a single chapter of a textbook, a small business owner separating individual invoices for GST filing, or a professional extracting relevant sections from lengthy reports, this tool simplifies your document management tasks without the hassle of uploading files to a server, ensuring privacy and speed.",
  "features": [
    "Browser-based operation: No need to upload files, ensuring your documents remain secure.",
    "Customizable page extraction: Select specific pages or ranges to create focused documents.",
    "User-friendly interface: Intuitive design makes it easy for anyone to navigate and use.",
    "Quick processing: Efficiently splits PDFs in a matter of seconds, saving you time.",
    "No file size limits: Handle large documents without worrying about size restrictions.",
    "Free to use: Access all features without any hidden costs, making it ideal for students and professionals."
  ],
  "useCases": [
    "Students preparing for exams can extract chapters from their textbooks to create concise study materials, ensuring they focus only on the relevant content without sifting through entire books.",
    "Freelancers and small business owners can split invoices from monthly statements to streamline their accounting processes, making it easier to manage GST filings and track payments.",
    "Legal professionals can extract specific clauses or sections from lengthy contracts, enabling them to share only the necessary parts with clients or colleagues.",
    "Government employees can separate specific forms from multi-page official documents, simplifying the process of sharing required information with the public."
  ],
  "howToUse": [
    "Step 1: Open the AWE-OS Split PDF tool at https://www.awe-os.com/tools/split-pdf and click \"Select PDF\" to upload your document or drag and drop it into the designated area.",
    "Step 2: Once the PDF is uploaded, specify the page range you wish to extract by entering the start and end pages in the provided fields.",
    "Step 3: Review your selections to ensure you are extracting the correct pages from the PDF.",
    "Step 4: Click the \"Split PDF\" button to initiate the extraction process, which will be completed in a matter of seconds.",
    "Step 5: Once the process is complete, download your new PDF file containing only the selected pages directly to your device."
  ],
  "whyUseUs": [
    "AWE-OS Split PDF is tailored for Indian users, providing a quick, efficient, and secure way to manage PDF documents without the need for software installations or uploads.",
    "With our tool, you can save valuable time and effort by extracting only the necessary information from large documents, making it easier to focus on what matters, whether for academic, professional, or personal use.",
    "Our platform is completely free, ensuring that students, freelancers, and businesses can access high-quality document management tools without incurring any costs or hidden fees."
  ],
  "faqs": [
    {
      "q": "Is my document safe when I use AWE-OS Split PDF?",
      "a": "Yes, your document is completely safe! AWE-OS Split PDF operates directly in your browser, meaning no files are uploaded to a server. This ensures your documents remain private and secure throughout the entire process, making it ideal for sensitive or confidential information."
    },
    {
      "q": "Can I use this tool on my smartphone or tablet?",
      "a": "Absolutely! AWE-OS Split PDF is designed to be fully responsive and works seamlessly on smartphones, tablets, and desktops. You can easily split PDFs from any device, making it convenient for users on the go or those who prefer mobile access."
    },
    {
      "q": "Are there any limitations on the number of pages I can extract?",
      "a": "No, there are no limitations on the number of pages you can extract using AWE-OS Split PDF. You can select any range of pages, regardless of the total number of pages in your PDF document. This flexibility allows you to tailor your output to your specific needs, whether you are working with short reports or lengthy academic texts."
    }
  ]
},

  'rotate-pdf': {
  "description": "AWE-OS Rotate PDF is an invaluable online tool for Indian users looking to adjust the orientation of their PDF documents effortlessly. Whether you’re a student preparing assignments, a business professional finalizing reports, or someone digitizing old records, this tool ensures your PDF pages are aligned correctly without the hassle of uploading sensitive documents to external servers. This service is free, efficient, and designed to help you manage your documents effectively. With the rise of digital transactions and documentation, having a reliable PDF rotation tool can save time and improve presentation quality, making it essential for both personal and professional use.",
  "features": [
    "Quick and easy PDF rotation for all pages or selected ones, saving you time and effort.",
    "Supports multiple rotation angles (90°, 180°, 270°), providing flexibility for various document needs.",
    "No server uploads required, ensuring your data privacy and security while editing documents.",
    "Instant download of corrected PDFs, allowing you to get back to your tasks without delays.",
    "User-friendly interface tailored for Indian users, ensuring accessibility and ease of use.",
    "Compatible with all major browsers, making it convenient to use from anywhere in India."
  ],
  "useCases": [
    "Students in India can use the Rotate PDF tool to quickly fix the orientation of their scanned notes or assignments, ensuring they present their work neatly during submissions, whether online or in-person.",
    "Small business owners can utilize this tool to rotate documents such as invoices and contracts, ensuring that all their paperwork is professionally presented before sending them to clients or vendors.",
    "Freelancers offering services such as graphic design or documentation can benefit from this tool by ensuring that all deliverables are in the correct orientation, enhancing their professionalism and client satisfaction.",
    "Individuals digitizing old family documents or photographs can use the Rotate PDF tool to adjust orientations, preserving cherished memories in a neat, organized manner, ready to be shared with loved ones."
  ],
  "howToUse": [
    "Step 1: Click on 'Select PDF' to upload your file or drag and drop it into the designated area on the tool's interface.",
    "Step 2: Choose which pages you wish to rotate - you can select all pages or specify certain page numbers for rotation.",
    "Step 3: Select the desired rotation angle (90°, 180°, or 270°) based on your document’s needs.",
    "Step 4: Click on the 'Rotate' button to process your request; the tool will instantly adjust the orientation of your selected pages.",
    "Step 5: Once completed, download the corrected PDF file directly to your device for immediate use."
  ],
  "whyUseUs": [
    "Our tool is completely free to use, making it a cost-effective solution for students, professionals, and anyone needing to manage PDFs in India without incurring costs.",
    "The convenience of processing documents directly in your browser without uploads ensures that your sensitive information remains private and secure.",
    "With a user-friendly design specifically aimed at Indian users, AWE-OS Rotate PDF is accessible to everyone, regardless of technical skill level, ensuring that anyone can manage their PDF documents with ease."
  ],
  "faqs": [
    {
      "q": "Is my document safe when using the AWE-OS Rotate PDF tool?",
      "a": "Absolutely! AWE-OS Rotate PDF operates entirely in your browser, meaning your documents are not uploaded to any server, ensuring your privacy and security. Your files remain on your device, and we do not collect any personal data or document information, making it a reliable choice for sensitive materials."
    },
    {
      "q": "Can I rotate scanned documents that are in PDF format?",
      "a": "Yes, the AWE-OS Rotate PDF tool is designed to handle various types of PDF files, including scanned documents. You can easily upload your scanned PDFs and rotate them to correct the orientation before downloading the adjusted version to ensure clarity and professionalism in your documents."
    },
    {
      "q": "What devices can I use to access the Rotate PDF tool?",
      "a": "The AWE-OS Rotate PDF tool is compatible with all major web browsers and can be accessed on various devices, including desktops, laptops, tablets, and smartphones. Whether you're at home, in a café, or on the go, you can easily rotate your PDFs from anywhere in India with an internet connection."
    }
  ]
},

  'watermark-pdf': {
  "description": "The AWE-OS Watermark PDF tool is designed to help Indian users add essential text watermarks to their PDF documents effortlessly. In a business landscape where confidentiality and professionalism are paramount, this tool allows you to watermark documents with phrases like 'CONFIDENTIAL', 'DRAFT', or 'SAMPLE' directly from your browser. Whether you are in the corporate sector, legal field, or academic environment, this tool is particularly useful for safeguarding client proposals, rate cards, and contract drafts before sharing them via email or messaging apps like WhatsApp. Protect your intellectual property and maintain your brand’s integrity with our easy-to-use solution, all for free.",
  "features": [
    "User-friendly interface that requires no downloads, allowing for quick and easy watermarking of PDFs.",
    "Customizable text options where you can choose font size, style, and position to match your document's layout.",
    "Ability to apply multiple watermarks to a single PDF, enhancing security for sensitive documents.",
    "Fast processing time, ensuring that you can watermark documents without unnecessary delays.",
    "No watermarks added by the tool itself, ensuring your document remains clean and professional.",
    "Compatible with various devices, allowing you to watermark on-the-go from your smartphone or tablet."
  ],
  "useCases": [
    "Indian startups often need to share proposals and business plans with potential investors. Using AWE-OS Watermark PDF, they can secure their documents with a watermark like 'CONFIDENTIAL' to prevent unauthorized distribution.",
    "Freelancers in India can use this tool to add watermarks to their creative drafts, ensuring that their designs and content are protected from being copied before final approval by clients.",
    "Legal professionals frequently draft contracts that require confidentiality. By watermarking these documents, they can communicate the sensitive nature of the content to clients and partners.",
    "Academic institutions often share research papers and thesis drafts. Watermarking these documents helps in protecting intellectual property while still allowing for collaborative feedback."
  ],
  "howToUse": [
    "Step 1: Click on 'Select PDF' or simply drag and drop your PDF file into the designated area on the tool's webpage.",
    "Step 2: In the provided text box, enter the watermark message you wish to apply, such as 'CONFIDENTIAL', and select the desired font size and style.",
    "Step 3: Choose the position of the watermark on the page, whether you want it centered, diagonal, or at a specific corner.",
    "Step 4: Click on the 'Add Watermark' button, and the tool will process your request to apply the watermark to your document.",
    "Step 5: Once processed, download your newly watermarked PDF to your device to use it as needed."
  ],
  "whyUseUs": [
    "AWE-OS Watermark PDF is completely free to use, making it an accessible option for Indian users ranging from startups to established businesses without the need for costly software.",
    "Our tool operates entirely online, eliminating the need for downloads or installations, which is particularly beneficial for users with limited bandwidth or storage.",
    "With a focus on Indian business practices, we ensure that the features and functionalities cater specifically to the needs of professionals in various industries across the country."
  ],
  "faqs": [
    {
      "q": "Is my document safe while using AWE-OS Watermark PDF?",
      "a": "Absolutely! We prioritize your privacy and security. All documents processed through our tool are not stored on our servers after processing, ensuring that your sensitive information remains confidential. You can watermark your PDFs without the fear of data breaches or unauthorized access."
    },
    {
      "q": "What types of watermarks can I add to my PDF?",
      "a": "You can add a variety of text watermarks to your PDFs, such as 'DRAFT', 'CONFIDENTIAL', 'SAMPLE', or even customized text that suits your needs. The tool allows you to select font styles and sizes, making it easy to integrate the watermark into your document's existing design."
    },
    {
      "q": "Can I use this tool on my mobile device?",
      "a": "Yes, the AWE-OS Watermark PDF tool is fully responsive and can be accessed from any device with a web browser, including smartphones and tablets. This flexibility enables you to watermark documents while on the move, ensuring that you can protect your work anytime, anywhere."
    }
  ]
},

  'protect-pdf': {
  "description": "AWE-OS Protect PDF is a user-friendly online tool designed specifically for Indian users to secure their PDF documents with password protection. In a digital age where sensitive information is frequently shared via email or messaging apps, this tool is essential for safeguarding important documents such as salary slips, bank statements, and business contracts. By adding a password to your PDFs, you ensure that only authorized individuals can access confidential information, helping to prevent data breaches and maintain privacy. With no need for software downloads, AWE-OS Protect PDF offers a seamless experience for users across India, allowing them to protect their documents in just a few clicks.",
  "features": [
    "Instant PDF password protection - Quickly secure your files without downloads or installations.",
    "User-friendly interface - Intuitive design makes it easy for anyone, regardless of technical skill, to protect their documents.",
    "Strong encryption - Utilizes robust encryption methods to ensure that your PDFs are secure and inaccessible to unauthorized users.",
    "No file size limits - Protect any size of PDF files without worrying about restrictions.",
    "Free to use - Enjoy all features without any cost, making it accessible for professionals and students alike.",
    "Browser-based convenience - Access the tool from any device with internet connectivity, eliminating the need for specific software."
  ],
  "useCases": [
    "Indian freelancers often send invoices and contracts via email. By using AWE-OS Protect PDF, they can add a password to their PDFs, ensuring that only their clients can view sensitive financial information, thus maintaining confidentiality and trust.",
    "Small business owners in India frequently share salary slips and financial statements with employees over WhatsApp. By securing these documents with a password, they can prevent unauthorized access and protect their employees' personal information.",
    "Students and educators alike can use AWE-OS Protect PDF to secure important academic documents, such as research papers and project reports, before sharing them with classmates or professors, ensuring only intended recipients can view them.",
    "Real estate agents often share property documents with potential buyers. By protecting these PDFs with a password, they can safeguard sensitive information, such as financial details and personal agreements, ensuring that only serious buyers have access."
  ],
  "howToUse": [
    "Step 1: Visit the AWE-OS Protect PDF tool page and click on 'Select PDF' or simply drag and drop your PDF file into the designated area.",
    "Step 2: Once your PDF is uploaded, enter a strong password that is at least 8 characters long, including a mix of letters, numbers, and symbols for enhanced security.",
    "Step 3: Review the details to ensure that the correct PDF is uploaded and the password meets security standards.",
    "Step 4: Click 'Protect PDF' to initiate the password protection process.",
    "Step 5: After the process is complete, download your secured PDF and share it with recipients, ensuring they know the password to access the document."
  ],
  "whyUseUs": [
    "AWE-OS Protect PDF is specifically tailored for Indian users, making it easier for professionals and students to secure sensitive documents in a culturally relevant context, such as protecting salary slips and financial statements.",
    "Our online tool is completely free, providing a cost-effective solution for individuals and businesses looking to maintain privacy without incurring expenses on software purchases.",
    "The tool is designed with user convenience in mind, allowing users to protect their PDFs from any device, making it ideal for the on-the-go lifestyle of many Indian professionals and students."
  ],
  "faqs": [
    {
      "q": "How secure is the password protection on AWE-OS Protect PDF?",
      "a": "The password protection provided by AWE-OS Protect PDF utilizes strong encryption algorithms to ensure that your documents are secure. This means that even if someone gains access to your PDF file, they will not be able to open it without the correct password. We recommend using a combination of letters, numbers, and symbols to create a strong password that is difficult to guess, ensuring maximum security for your sensitive information."
    },
    {
      "q": "Can I protect multiple PDF files at once?",
      "a": "Currently, AWE-OS Protect PDF allows users to protect one PDF file at a time. However, the process is quick and efficient, so you can easily repeat the steps for each document you wish to secure. This ensures that all your sensitive files, whether they are salary slips, bank statements, or business agreements, can be protected individually with unique passwords."
    },
    {
      "q": "What if I forget the password I set for my PDF?",
      "a": "If you forget the password you set for your PDF file, unfortunately, there is no way to recover it through AWE-OS Protect PDF. It is crucial to keep a record of your passwords in a secure location. To avoid this issue, consider using a password manager or writing it down in a safe place until you are confident you will remember it. Always choose a password that balances security and memorability."
    }
  ]
},

  'unlock-pdf': {
    whatIsIt: 'AWE-OS Unlock PDF removes password protection from a PDF document you already own, allowing it to be opened freely without entering a password each time. It is designed for users who have the password to their own document but want to remove the restriction — common with bank-issued statements, salary slips, and credit card PDFs that are automatically password-protected with your date of birth or account number.',
    howToUse: [
      'Upload your password-protected PDF by clicking "Select PDF" or dragging the file',
      'Enter the current password that unlocks the document',
      'Click "Unlock PDF" — the tool removes the password restriction from the file',
      'Download the unlocked PDF, which can now be opened without entering a password',
    ],
    whyUseUs: [
      '100% free — no limits on file size or number of PDFs unlocked',
      'Private — unlocking happens locally in your browser, PDF and password never uploaded',
      'No signup required — remove password protection instantly',
      'Works on PDFs issued by Indian banks including HDFC, ICICI, SBI, and Axis',
    ],
    faqs: [
      { q: 'Is Unlock PDF free?', a: 'Yes. Completely free with no limits and no watermarks on the unlocked PDF.' },
      { q: 'Is this legal?', a: 'Removing password protection from PDFs you own and have the password for is legal. This tool is designed for users who have legitimate access to the document. It should not be used to access documents you are not authorised to view.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge.' },
      { q: 'Why do Indian banks send password-protected PDFs?', a: 'Indian banks such as HDFC, ICICI, SBI, Axis, and Kotak typically protect emailed account statements and credit card PDFs with the account holder\'s date of birth (in DDMMYYYY format) or a combination of PAN and date of birth. This is a basic security measure so that if the email is intercepted, the statement cannot be read without the account holder\'s personal details. Once you have verified the content, removing the password using a browser-based tool is safe and convenient for long-term document storage.' },
    ],
  },

  'image-compressor': {
    description: 'AWE-OS Image Compressor reduces the file size of JPEG, PNG, and WebP images directly in your browser without uploading them to any server. It is essential for Indian users who need to compress profile photos for government portals (passport applications, college admissions, UPSC exam registrations), product images for e-commerce listings on Amazon India and Flipkart, and images shared on WhatsApp where large files load slowly on mobile data connections. The tool provides a real-time side-by-side preview showing the original and compressed image quality alongside exact file sizes, so you can fine-tune the quality slider before downloading. With a recommended starting point of 80% quality, most images reduce by 60–80% in size with minimal perceptible quality loss. The compressor works entirely within your browser using the HTML5 Canvas API — no files are ever sent to a remote server, making it completely private and safe for sensitive personal photographs and identity documents.',
    features: [
      'Supports JPEG, PNG, and WebP image formats with output in JPEG for maximum compression',
      'Adjustable quality slider from 10% to 100% with real-time preview of quality and file size changes',
      'Side-by-side before/after comparison showing original and compressed file sizes in KB/MB',
      'Batch compression — compress multiple images in sequence without page reload',
      'Works entirely offline once the page loads — no internet required for compression',
      'No file size limit — handles high-resolution DSLR photos, product shots, and scanned documents',
    ],
    useCases: [
      'Students and job seekers compressing passport-size photos to meet government portal file size limits (typically under 50KB or 100KB)',
      'E-commerce sellers on Amazon India and Flipkart optimising product images to improve page load speed and meet platform upload limits',
      'WhatsApp users reducing large photo files to send faster on mobile data connections without significant quality loss',
      'Web developers and designers optimising images for websites and mobile apps to improve Core Web Vitals and loading performance',
    ],
    howToUse: [
      'Click "Upload Image" or drag your JPEG, PNG, or WebP image into the drop zone',
      'Adjust the quality slider — 80% is the recommended starting point for most use cases',
      'Compare the before and after file sizes shown in the preview panel',
      'Move the slider lower if you need a smaller file, or higher to preserve more detail',
      'Click "Download" to save the compressed image to your device — no account needed',
    ],
    whyUseUs: [
      'Live side-by-side preview lets you see exactly what you are getting before downloading — no guessing about final quality unlike tools that compress first and show you afterwards',
      '100% browser-based and private — your images including personal photos and identity documents are never uploaded to any server and are discarded when you close the tab',
      'Free with no file size limits, no watermarks on output, and no account or signup required — works on any device instantly',
    ],
    faqs: [
      { q: 'What quality setting should I use for government portal uploads?', a: 'For government portal profile photo uploads (passport applications, UPSC, SSC, bank exam registrations): use 80–85% quality to maintain facial clarity while meeting the typical 50KB–100KB file size limits. For scanned document uploads (marksheets, certificates): use 85–90% to keep text readable. Always check the specific portal\'s requirements for file size, dimensions, and format before compressing.' },
      { q: 'Is my image safe when compressing online on AWE-OS?', a: 'Yes. All compression happens locally in your browser using the HTML5 Canvas API. Your images — including personal photos, product images, and identity documents — are never uploaded to any server and are permanently discarded when you close the browser tab. This makes AWE-OS Image Compressor safe for Aadhaar card photos, PAN card scans, and other sensitive documents.' },
      { q: 'Does Image Compressor work on mobile phones?', a: 'Yes. The tool works on Android and iOS in Chrome, Firefox, Safari, and Edge. You can upload images directly from your phone\'s camera roll or gallery. On mobile, we recommend compressing one image at a time for best performance. The quality slider is touch-friendly and the download works directly to your device storage.' },
    ],
  },

  'qr-code-generator': {
    description: 'AWE-OS QR Code Generator creates scannable QR codes for URLs, plain text, phone numbers, email addresses, and contact cards (vCard) — entirely in your browser with no signup required. QR codes are widely used across India for UPI payment links (Google Pay, PhonePe, Paytm), restaurant digital menus, business card contact sharing, product packaging traceability, and event or conference registrations linking to Google Forms or registration portals. The generator uses the qrcode.js library to render QR codes locally in your browser at high resolution, so the output PNG is suitable for both print and digital use. You can select the error correction level (Low, Medium, Quartile, or High) — High is recommended for printed QR codes that may get partially damaged or dirty. Generated QR codes are immediately downloadable as PNG images at up to 1024×1024 pixels, sharp enough for business cards, menus, posters, and product packaging.',
    features: [
      'Five QR code types: URL/Link, Plain Text, Phone Number, Email Address, and Contact Card (vCard format)',
      'Four error correction levels: Low (7%), Medium (15%), Quartile (25%), and High (30%) — High recommended for printed codes',
      'Adjustable output size from 128×128 to 1024×1024 pixels for use on screen, cards, and print',
      'Download as a high-resolution PNG image suitable for business cards, menus, and poster printing',
      'Instant generation — QR code updates in real time as you type content',
      'Foreground and background colour customisation for brand-consistent QR codes',
    ],
    useCases: [
      'Business owners and restaurants creating QR codes for UPI payment links (Google Pay/PhonePe) and digital menus for contactless ordering',
      'Freelancers and professionals adding a vCard QR code to business cards so contacts can save phone and email with a single scan',
      'Event organisers creating QR codes for registration forms, entry tickets, and session links at conferences and exhibitions',
      'E-commerce sellers adding product traceability QR codes to packaging that link to authenticity pages, user manuals, or warranty registration',
    ],
    howToUse: [
      'Select the QR code type from the dropdown: URL, Text, Phone, Email, or Contact Card (vCard)',
      'Enter the content — paste a URL, type a phone number with country code (+91 for India), or fill in the contact card fields',
      'Choose the error correction level — use High for QR codes that will be printed on paper or packaging',
      'Adjust the output size and optionally customise the foreground colour for brand matching',
      'Click "Generate QR Code" and download the PNG — scan it immediately with your phone camera to verify it works before printing',
    ],
    whyUseUs: [
      'Five content types in one tool — most free QR generators only support URLs; our generator handles vCard contacts and phone numbers natively without workarounds',
      'High error correction (30%) available for printed QR codes that must survive being partially damaged, dirty, or placed on curved surfaces like bottles and packaging',
      '100% browser-based and private — the URL, phone number, or contact details you encode are never sent to any server, critical for business data privacy',
    ],
    faqs: [
      { q: 'Is QR Code Generator free to use?', a: 'Yes. Completely free with no account required, no watermarks on generated QR codes, and no limit on how many QR codes you generate. There are no expiry dates on QR codes created with this tool — a URL-based QR code remains scannable for as long as the destination URL works.' },
      { q: 'What size should I use for a printed QR code?', a: 'For business cards: a minimum print size of 2cm × 2cm is recommended (use High error correction). For restaurant menus and table tents: 4cm × 4cm or larger for reliable scanning from 30–50cm distance. For A4 posters and flyers: 6cm × 6cm minimum. For outdoor signage and banners: 10cm × 10cm minimum to allow scanning from 1–2 metres away. Always test-scan the printed QR code before mass printing — lighting, print quality, and surface texture can affect scannability.' },
      { q: 'Will my QR code expire?', a: 'QR codes generated by AWE-OS do not expire — there is no AWE-OS server involved in the generation or tracking. However, if your QR code contains a URL, it will stop working if the destination URL is deleted, the domain expires, or the page returns a 404 error. For long-term use (product packaging, signage), consider using a URL shortener service that allows redirect updates so you can change the destination without reprinting the QR code.' },
      { q: 'How do Indian businesses use QR codes for UPI payments?', a: 'UPI (Unified Payments Interface) QR codes enable customers to pay any merchant instantly by scanning with Google Pay, PhonePe, Paytm, or any UPI-enabled banking app. A UPI payment QR code encodes a UPI deep-link in the format: upi://pay?pa=merchant@upi&pn=MerchantName&am=Amount&cu=INR. The "pa" parameter is the UPI ID (Virtual Payment Address), and "am" is optional — leaving it blank lets the customer enter the amount, while pre-filling it creates a fixed-amount payment link (useful for specific product prices). You can generate a UPI QR code using the AWE-OS QR Generator by selecting the URL type and pasting your UPI deep-link. Most Indian businesses display UPI QR codes at point of sale, on invoices, and on menus — giving customers a contactless payment option without requiring a card terminal.' },
      { q: 'Can I use QR codes for WhatsApp Business marketing in India?', a: 'Yes. WhatsApp Business QR codes are widely used by Indian SMBs to start conversations with customers instantly. A WhatsApp QR code encodes a URL of the format: https://wa.me/91XXXXXXXXXX?text=Hello, which opens WhatsApp with a pre-filled message to your business number when scanned. Use the URL type in the AWE-OS QR Generator and paste your WhatsApp Business link. Print the QR code on business cards, packaging, store displays, and delivery bags so customers can instantly reach your WhatsApp Business account for orders, support, and follow-ups. With over 500 million WhatsApp users in India, this is one of the most effective low-cost customer acquisition channels for Indian small businesses.' },
    ],
  },

  'password-generator': {
    description: 'AWE-OS Password Generator creates cryptographically secure passwords using your browser\'s built-in random number generator (window.crypto.getRandomValues) — not a predictable mathematical formula. Generated passwords meet NIST SP 800-63B guidelines for length, character diversity, and randomness. Use it to create strong passwords for your income tax portal login, EPFO/UAN account, DigiLocker, net banking accounts at SBI/HDFC/ICICI, and any other account where a weak or reused password could cause financial or identity harm. The tool supports custom length from 8 to 128 characters and lets you include or exclude uppercase letters, lowercase letters, digits, and special characters to meet any site\'s password policy. All passwords are generated locally in your browser tab — they are never transmitted to any server, never logged, and permanently discarded when you close or refresh the page.',
    features: [
      'Cryptographically secure generation using window.crypto.getRandomValues — not the predictable Math.random()',
      'Adjustable password length from 8 to 128 characters with a recommended default of 16',
      'Character type controls: uppercase letters (A–Z), lowercase letters (a–z), digits (0–9), and special characters (!@#$%^&*)',
      'Strength meter showing entropy bits so you can see exactly how strong the generated password is',
      'One-click copy to clipboard for instant pasting without risk of typing errors',
      'Bulk generation — generate multiple passwords at once for setting up multiple accounts simultaneously',
    ],
    useCases: [
      'Salaried employees and students creating strong passwords for government portals like income tax e-filing, EPFO UAN, DigiLocker, and NPS accounts',
      'Professionals setting up new accounts on banking portals (SBI Net Banking, HDFC NetBanking, ICICI iMobile) where weak passwords risk financial loss',
      'IT administrators and developers generating secure API keys, temporary passwords, and service account credentials during system setup',
      'Individuals replacing weak or reused passwords across multiple accounts following a data breach notification or security audit',
    ],
    howToUse: [
      'Set the password length using the slider — 16 characters is the recommended minimum for sensitive accounts; use 20+ for banking and email',
      'Select the character types to include — enable all four (uppercase, lowercase, digits, special characters) for maximum strength',
      'Click "Generate Password" to create a new secure password — the strength meter shows the entropy in bits',
      'Click the "Copy" button to copy the password to your clipboard, then immediately paste it into the password field',
      'Store the password in a password manager (such as Bitwarden, free and open-source) before closing the tab — it will not be recoverable afterwards',
    ],
    whyUseUs: [
      'Cryptographically secure randomness — uses window.crypto.getRandomValues which is the browser\'s hardware-backed random number generator, not the guessable Math.random() used by many online generators',
      'Strength meter showing entropy bits gives you a quantifiable security measure, not just a vague "Weak/Strong" label — 60+ bits of entropy is good, 80+ bits is excellent for most purposes',
      '100% private — passwords are generated in your browser tab and never transmitted to any server, never logged, and permanently gone when you close the tab',
    ],
    faqs: [
      { q: 'How long should my password be?', a: 'NIST\'s 2024 guidelines (SP 800-63B) recommend a minimum of 15 characters for standard accounts and 20 characters for high-value accounts such as email, banking, and government portals. Length matters more than complexity — a 20-character password of mixed types is far stronger than a short but complex 8-character one. A 16-character random password (with all character types) has approximately 105 bits of entropy and would take hundreds of thousands of years to brute-force with current hardware.' },
      { q: 'Are the generated passwords stored anywhere?', a: 'No. Passwords are generated entirely within your browser tab using JavaScript and are never transmitted to any server. They exist only in your browser\'s memory until you navigate away or close the tab. AWE-OS has no server-side component for this tool and cannot see, log, or recover any generated password. For this reason, copy the password to a password manager immediately — once you close the tab, it is permanently gone.' },
      { q: 'Which password manager should I use to store generated passwords?', a: 'Bitwarden is recommended — it is free, open-source, end-to-end encrypted, and available on Windows, macOS, Android, and iOS. KeePass is a good offline-only alternative. For Indian bank accounts, use a password manager rather than the browser\'s built-in save feature, since browser-saved passwords are accessible to any other website or extension that can access your browser profile. Enable two-factor authentication (2FA) on your password manager account for an additional layer of security.' },
    ],
  },

  'word-counter': {
    whatIsIt: 'AWE-OS Word Counter tracks word count, character count, sentence count, paragraph count, and estimated reading time in real time as you type or paste text. It is used by students writing essays with strict word limits, UPSC and competitive exam candidates checking answer length, content writers billing by word count, and LinkedIn and Twitter users formatting posts within platform character limits.',
    howToUse: [
      'Type or paste your text into the text area — all counts update in real time instantly',
      'Check the word count, character count (with and without spaces), sentence count, and paragraph count',
      'Use the reading time estimate for blog posts and articles to verify expected reader engagement time',
      'Clear the text box and paste new content to count different documents',
    ],
    whyUseUs: [
      '100% free — no limits on text length, no account required',
      'Private — text is processed locally in your browser, never sent to any server',
      'Real-time counting — all metrics update instantly as you type or paste',
      'Multiple metrics: words, characters, sentences, paragraphs, and reading time',
    ],
    faqs: [
      { q: 'Is Word Counter free?', a: 'Yes. Completely free with no character limits and no account required.' },
      { q: 'Is my text stored anywhere?', a: 'No. All counting happens locally in your browser. Your text is never sent to any server and is discarded when you close the tab. This makes it safe for confidential documents, legal drafts, and business reports.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge.' },
      { q: 'How does the reading time estimate work?', a: 'Reading time is calculated at 200 words per minute — the average adult reading speed for comprehension of standard prose. Academic and technical texts are typically read at 150–180 wpm, so the estimate may be slightly optimistic for complex content. For a blog post targeting a "5-minute read" label, aim for 900–1000 words. For UPSC Mains, the guideline of approximately 150–200 words per 10-mark answer translates to about 1–1.5 minutes of reading time for the examiner.' },
    ],
  },

  'currency-converter': {
    description: 'AWE-OS Currency Converter is a free online tool that provides live exchange rates between the Indian Rupee (INR) and 14 major world currencies: US Dollar (USD), Euro (EUR), British Pound (GBP), UAE Dirham (AED), Singapore Dollar (SGD), Canadian Dollar (CAD), Australian Dollar (AUD), Japanese Yen (JPY), Swiss Franc (CHF), Hong Kong Dollar (HKD), Swedish Krona (SEK), Norwegian Krone (NOK), New Zealand Dollar (NZD), and Chinese Yuan (CNY). The tool is essential for Indian IT freelancers invoicing US clients in USD on Upwork or Fiverr, consultants billing UK or UAE firms in GBP or AED, and content creators on YouTube and other platforms monetising in dollars. NRIs transferring money to India from the USA, UK, UAE, Singapore, and Canada use it to check whether the current rate is favourable before initiating a transfer via SWIFT, Wise, Remitly, or Western Union. Exchange rates track the RBI Reference Rate — the official mid-market rate published daily by the Reserve Bank of India for the USD-INR pair — which is the benchmark for interbank settlements. Retail conversion rates from banks include a markup of 2–4% above this mid-market rate, while online money-transfer services like Wise, Remitly, and Instarem are typically closer to the mid-market rate with transparent fees.',
    features: [
      'Live exchange rates between INR and 14 major world currencies updated regularly from financial market data',
      'Bidirectional conversion — convert INR to foreign currency or foreign currency to INR with a single swap button click',
      'Covers remittance-critical corridors: INR/USD (USA), INR/AED (UAE, the single largest source of India remittances), INR/GBP (UK), INR/SGD (Singapore)',
      'Instant results — no page reload, no submit button — conversion updates as you type the amount',
      'Works on mobile phones — essential for checking rates at airport currency exchange counters, foreign ATMs, or while travelling abroad',
      'No signup, no account, completely free — check rates as many times as needed without any registration',
    ],
    useCases: [
      'IT professionals, freelancers, and Upwork/Fiverr contractors invoicing US clients in USD who need the current INR equivalent for accounting, GST invoice generation, and advance tax planning',
      'NRIs in the USA, UK, UAE, and Canada checking live rates before sending remittances to family in India — to compare against their bank or app rate and decide the best time to transfer',
      'Students applying to foreign universities in the US, UK, Canada, or Australia who need to convert tuition fees and living costs to INR for education loan calculations and financial planning',
      'Indian travellers converting INR to USD, GBP, AED, SGD, or JPY cash before international travel, or checking rates for international hotel and flight bookings charged in foreign currency',
    ],
    howToUse: [
      'Select the source currency from the dropdown — choose INR to convert rupees to a foreign currency, or select a foreign currency (e.g., USD or AED) to convert to INR',
      'Select the target currency from the second dropdown — for example, USD, AED, GBP, or SGD',
      'Enter the amount you want to convert in the input field',
      'The converted amount updates instantly based on the current exchange rate — no submit button needed',
      'Use the swap button (↔) to instantly reverse the conversion direction — useful for switching between "how much INR do I receive" and "how many dollars do I need to send" calculations',
    ],
    whyUseUs: [
      'Covers the INR/AED corridor specifically — UAE is the single largest source country for India\'s remittances (approximately $15 billion annually), yet many basic converters skip AED; AWE-OS includes it as a primary currency',
      'No hidden charges — this is a reference rate tool, not a money-transfer service; the rates shown are mid-market rates for planning, and you can clearly compare them against your bank\'s rate to understand the true spread',
      'Free, instant, and mobile-friendly with no login — works at airport currency counters, during business calls with international clients, and anywhere you need a quick INR conversion on your phone',
    ],
    faqs: [
      { q: 'How does the RBI Reference Rate differ from what my bank charges for currency conversion?', a: 'The RBI Reference Rate is the mid-market rate — the midpoint between the buy and sell rates in the interbank foreign exchange market — published daily by the Reserve Bank of India for the USD-INR pair (and a few other major pairs). It is used as a benchmark for regulatory reporting and interbank settlements. When you buy or sell foreign currency at a bank or airport counter, the bank applies a spread of 2–5% above this mid-market rate. Online remittance services like Wise, Remitly, and Instarem use rates very close to the mid-market rate and charge a transparent flat fee instead of a hidden spread, which is why they typically offer better rates than traditional banks for NRI remittances.' },
      { q: 'Which is the best way for NRIs to send money to India and get the best INR rate?', a: 'For NRIs, online money-transfer services generally offer better INR exchange rates than traditional bank SWIFT transfers. Services like Wise (available from USA, UK, EU, Singapore, Canada, Australia) offer rates very close to the mid-market rate with a small transparent fee. Remitly and Instarem are also competitive. Traditional bank SWIFT transfers typically charge a flat fee (₹1,000–₹2,500 at Indian receiving bank) plus a 2–4% exchange rate spread. For large transfers above ₹10 lakh equivalent, even a 0.5% better rate saves ₹5,000+, so comparing rates before transferring is worthwhile. Use the AWE-OS Currency Converter to check the mid-market rate, then compare your bank\'s or app\'s offered rate to understand the spread.' },
      { q: 'Do IT freelancers in India need to pay GST on foreign currency income?', a: 'Indian IT freelancers and consultants receiving payment in USD or other foreign currencies for services rendered to foreign clients are generally classified as exporters of services under GST. Exports of services are zero-rated under GST (0% rate), meaning no GST is charged to the foreign client and the freelancer can claim refund of input GST paid on business expenses. However, the freelancer must have a GSTIN if annual turnover exceeds ₹20 lakh (₹10 lakh for special category states). The foreign currency received must be converted to INR at the RBI Reference Rate for GST invoice generation. Income tax is still payable in India on foreign income if you are a Resident or RNOR under FEMA/Income Tax Act — check with a CA for your specific situation.' },
    ],
  },

  'unit-converter': {
  "description": "The AWE-OS Unit Converter is an essential tool for Indian users, allowing seamless conversion between various measurement units such as length, weight, temperature, speed, area, and volume. With the inclusion of Indian-specific units like bigha for land area and tola for gold weight, this tool caters specifically to local needs. Whether you are planning a home renovation, calculating property values in your state, or adjusting recipes that require precise measurements, our unit converter is designed to make your tasks easier, saving time and reducing the risk of errors.",
  "features": [
    "Covers a wide range of measurement categories including length, weight, temperature, and area to cater to diverse needs.",
    "Includes Indian-specific units like bigha, marla, and tola, ensuring relevance for local users.",
    "User-friendly interface allowing quick and easy conversions without technical knowledge.",
    "Real-time conversion results that help in immediate decision-making for buying or selling properties.",
    "Supports both metric and imperial systems, providing flexibility for various applications.",
    "Free to use with no hidden charges, making it accessible for all Indian users."
  ],
  "useCases": [
    "When researching property prices in India, you may need to convert square feet to bigha or acres to square meters. Our unit converter simplifies this process, allowing you to quickly assess property values in your area and make informed decisions.",
    "For students working on physics assignments, converting units such as grams to kilograms or Celsius to Fahrenheit is often necessary. Our tool provides accurate conversions to help students complete their projects seamlessly.",
    "In cooking, many Indian recipes use traditional measurements like tola for weight. Our unit converter allows home cooks to easily switch between standard and traditional measurements, ensuring that every dish is prepared perfectly.",
    "When shopping for products online, understanding dimensions and weights in both metric and imperial systems can be challenging. Our unit converter helps users quickly convert these measurements, facilitating better purchasing decisions."
  ],
  "howToUse": [
    "Step 1: Visit the AWE-OS Unit Converter webpage at https://www.awe-os.com/tools/unit-converter.",
    "Step 2: Select the measurement category you wish to convert, such as length, weight, or area from the provided options.",
    "Step 3: Choose the source unit from the dropdown menu. For example, if you are converting land area, select 'bigha' or 'square feet'.",
    "Step 4: Next, choose the target unit you want to convert to from the second dropdown menu.",
    "Step 5: Click on the 'Convert' button to view the results instantly, allowing you to make quick decisions based on the conversion."
  ],
  "whyUseUs": [
    "Our unit converter is specifically designed for Indian users, providing units and measurements that are commonly used in the country, making it more relevant and user-friendly.",
    "The tool is completely free, making it accessible for everyone, whether you are a student, a professional, or a homemaker looking to simplify your tasks.",
    "With real-time conversions and a straightforward interface, users can trust the accuracy of the results, ensuring better decision-making across various everyday scenarios."
  ],
  "faqs": [
    {
      "q": "What units can I convert using the AWE-OS Unit Converter?",
      "a": "The AWE-OS Unit Converter allows you to convert a wide range of units across various categories including length (meters, kilometers), weight (grams, kilograms, tolas), temperature (Celsius, Fahrenheit), area (square feet, bigha, acres), and volume (liters, milliliters). This diverse offering ensures that users from different sectors can find the measurements they need easily."
    },
    {
      "q": "Is the AWE-OS Unit Converter suitable for professional use?",
      "a": "Absolutely! The AWE-OS Unit Converter is designed to meet the needs of both casual users and professionals. Whether you are in real estate needing to convert land measurements or a chef converting recipe ingredients, the tool provides accurate results that can assist in various professional contexts, making it a reliable resource for all."
    },
    {
      "q": "Can I rely on the conversions provided by the AWE-OS Unit Converter?",
      "a": "Yes, you can trust the conversions provided by the AWE-OS Unit Converter. The tool is built to ensure accuracy and reliability, catering specifically to the needs of Indian users. However, it is always advisable to double-check critical conversions, especially in professional or legal contexts, to ensure compliance with local regulations and standards."
    }
  ]
},

  // ── NEW TOOLS ──────────────────────────────────────────────────────────────

  'gst-calculator': {
    description: 'AWE-OS GST Calculator is a free online tool that instantly computes Goods and Services Tax (GST) for any transaction in India. Introduced in July 2017, GST replaced a complex web of central and state taxes — VAT, service tax, excise duty, and octroi — with a unified four-slab indirect tax system at 0%, 5%, 12%, 18%, and 28%. The calculator supports both GST-exclusive mode (adding GST to a base price to find the total) and GST-inclusive mode (extracting the tax component from a final price that already includes GST). It automatically computes the CGST and SGST split for intra-state transactions (each is half the total GST rate) and the IGST amount for inter-state transactions. Results are displayed as a clean breakdown showing base amount, GST rate selected, CGST, SGST/IGST, and the final invoice amount — ready for use in GST-compliant invoices under the format mandated by the GSTN (Goods and Services Tax Network) for Indian financial year billing (April to March).',
    features: [
      'Supports all four GST slabs: 5%, 12%, 18%, and 28% plus the 0% exempt category',
      'GST-exclusive mode: add GST to a base price to calculate the total payable amount',
      'GST-inclusive mode: reverse-calculate to extract base price and GST from a GST-included total',
      'Automatic CGST and SGST split for intra-state supplies (each = GST rate ÷ 2)',
      'IGST calculation for inter-state transactions as per GST Act provisions',
      'Clean invoice-ready breakdown: base amount, GST %, CGST, SGST/IGST, and total — in Indian Rupee (₹) format',
    ],
    useCases: [
      'Small business owners and traders raising GST invoices for clients and needing accurate CGST/SGST breakdowns as required by GSTN',
      'Freelancers and consultants charging 18% GST on professional services who need to verify the tax amount before raising invoices',
      'Consumers and shoppers checking whether the GST charged on a bill is correct and corresponds to the applicable slab for that product or service',
      'Accounting students, CA inter students, and commerce graduates learning GST computation for examinations and practical training',
    ],
    howToUse: [
      'Enter the transaction amount in Indian Rupees (₹) — enter the base (pre-tax) price for GST-exclusive calculation, or the final price for GST-inclusive reverse calculation',
      'Select the applicable GST rate from the slab options: 0%, 5%, 12%, 18%, or 28%',
      'Choose the calculation mode: "Add GST" to compute tax on a base price, or "Remove GST" to extract tax from a GST-included amount',
      'Select the transaction type: Intra-state (within same state — CGST + SGST apply) or Inter-state (between different states — IGST applies)',
      'The calculator instantly displays the base amount, GST amount broken into CGST/SGST or IGST, and the final total — copy the values for your invoice',
    ],
    whyUseUs: [
      'Dual-mode calculation — both adding GST to a base price and reverse-extracting GST from an inclusive price in the same tool, which is essential for both invoicing and verifying bills received from vendors',
      'CGST/SGST/IGST automatic split — most basic GST calculators only show total GST; ours computes the correct split for both intra-state and inter-state transactions as required by the GST Act for GSTIN-compliant invoices',
      'Free, instant, and browser-based — no login, no spreadsheet, and no accounting software needed for quick GST computations during business hours',
    ],
    faqs: [
      { q: 'What are the GST slabs in India?', a: 'India\'s GST system has five slabs. 0% (exempt): basic food items like fresh vegetables, milk, bread, eggs, meat, salt, and cereals. 5%: edible oils, spices, tea, coffee, medicines, and certain transport services. 12%: processed foods, smartphones, computers, business-class air travel, and hotel rooms between ₹1,000–₹7,500/night. 18%: most services including restaurants (except those in hotels), telecom, IT services, financial services, hotel rooms above ₹7,500/night, and most manufactured goods. 28%: luxury goods, tobacco products, aerated drinks, automobiles, and certain entertainment services. Many items also attract a GST Compensation Cess on top of the 28% rate (e.g., cigarettes, luxury cars).' },
      { q: 'What is the difference between CGST, SGST, and IGST?', a: 'When a supplier and buyer are in the same state (intra-state transaction), GST is split equally between the Central Government (CGST) and the State Government (SGST). For example, on an 18% GST transaction, CGST = 9% and SGST = 9%. When the supplier and buyer are in different states (inter-state transaction), the full GST is charged as IGST (Integrated GST), which goes entirely to the Central Government and is then redistributed to the destination state. IGST = the full GST rate (e.g., 18% IGST on an inter-state supply).' },
      { q: 'When does a business need to register for GST in India?', a: 'GST registration is mandatory for businesses with an annual aggregate turnover exceeding ₹40 lakh (₹20 lakh for special category states like Himachal Pradesh, Uttarakhand, and northeastern states). For service providers, the threshold is ₹20 lakh (₹10 lakh for special category states). Businesses engaged in inter-state supply of goods, e-commerce operators, and businesses required to deduct TDS under GST must register regardless of turnover. Voluntary registration is also available for businesses below the threshold who wish to claim Input Tax Credit (ITC).' },
    ],
  },

  'tip-calculator': {
    description: 'AWE-OS Tip Calculator is a free online tool that calculates the tip amount and total bill for restaurant dining, hotel services, food delivery, and other service transactions. While tipping culture in India differs from Western countries — it is discretionary and not mandatory — it has become more common in urban restaurants, hotel restaurants, and food delivery contexts. The calculator lets you enter the bill amount, select a tip percentage (with common presets of 10%, 15%, 18%, and 20% and a custom input option), and specify the number of people splitting the bill. It instantly shows the tip amount per person, total bill per person, and the overall total including tip. It is particularly useful for corporate team lunches, college group outings, and family restaurant meals where splitting the bill fairly and adding a consistent tip requires quick mental arithmetic that is easy to get wrong.',
    features: [
      'Common tip percentage presets: 10%, 15%, 18%, and 20% with a custom percentage input option',
      'Bill splitting calculator showing per-person tip amount and per-person total for groups of 2 to 20',
      'Round-up option to round the per-person total to the nearest ₹10 or ₹100 for easier cash payment',
      'Tip quality guide showing what each percentage conventionally signals about service satisfaction',
      'Total bill breakdown: original amount, tip amount, and final total with tip clearly displayed',
      'Works with any currency — useful for Indian travellers calculating tips abroad in USD, GBP, or AED',
    ],
    useCases: [
      'Restaurant-goers in Indian cities wanting to add a fair tip for good service without slow mental arithmetic at the table',
      'Corporate teams and colleagues splitting a team lunch or dinner bill evenly with a consistent tip for all',
      'Indian travellers abroad in the US, UK, UAE, or Singapore where tipping etiquette and percentages differ from India',
      'Food delivery customers on Swiggy or Zomato calculating an appropriate cash tip for delivery partners at the door',
    ],
    howToUse: [
      'Enter the total restaurant bill amount in rupees (or any currency) in the bill field',
      'Select a tip percentage from the preset buttons — 10% for adequate service, 15% for good service, 20% for excellent service — or enter a custom percentage',
      'Enter the number of people splitting the bill (enter 1 if you are paying alone)',
      'The calculator instantly shows the tip amount, total bill with tip, and the per-person share of both',
      'Use the round-up toggle if you prefer to round each person\'s share to the nearest ₹10 for easier cash payment',
    ],
    whyUseUs: [
      'Bill splitting and tip calculation in a single step — enter the number of people and get per-person totals immediately, unlike basic tip calculators that only show the total',
      'Round-up feature makes cash payment easy — splits rounded to the nearest ₹10 avoid the need for exact change at the table',
      'Free, instant, and works entirely in your browser without any account or app installation required',
    ],
    faqs: [
      { q: 'What is the standard tip percentage in Indian restaurants?', a: 'Tipping is not obligatory in India and many restaurants already include a 5–10% "service charge" in the bill. If no service charge is added, a tip of 10% is considered adequate for standard service, 15% for good service, and 20% for exceptional service. Note that the Supreme Court and the Department of Consumer Affairs have clarified that service charges are not mandatory — you can request its removal from the bill if you feel service was unsatisfactory. For hotel restaurants and fine dining, a 10–15% tip is more commonly expected.' },
      { q: 'Should I tip food delivery partners on Swiggy and Zomato?', a: 'Tipping delivery partners is becoming more common in Indian cities, though it is not expected. A cash tip of ₹20–₹50 per delivery is appreciated, especially during difficult weather conditions (monsoon, extreme heat), for long-distance deliveries, or for night-time deliveries. Both Swiggy and Zomato also have in-app tipping options on Android and iOS where you can add a tip at the time of ordering or after delivery.' },
      { q: 'How does the bill splitting calculation work?', a: 'The tool divides the total bill (original amount + tip) equally by the number of people entered. For example: ₹2,000 bill with 15% tip = ₹300 tip, ₹2,300 total. Split 4 ways: ₹575 per person. With the round-up option enabled, each person pays ₹580 (rounded to nearest ₹10), and the extra ₹20 typically goes into the tip pool. For unequal splits where different people ordered different amounts, use the bill amount for just your share and the number of people as 1.' },
      { q: 'What is the tipping etiquette when travelling abroad from India?', a: 'Tipping customs vary significantly by country and differ from India\'s discretionary culture. In the United States, a 15–20% tip is expected and effectively mandatory at sit-down restaurants — waitstaff earn most of their income from tips as base wages can be as low as $2.13/hour. In the United Kingdom, 10–12.5% is standard and often added automatically as a "service charge." In the UAE (Dubai, Abu Dhabi), 10% is appreciated but not compulsory in most non-hotel restaurants. In Singapore, a 10% service charge is added by law to most restaurant bills, making additional tipping unnecessary. In Japan, tipping is considered rude and should be avoided entirely. The AWE-OS Tip Calculator works in any currency, so you can use it for international travel by entering the bill amount in the local currency.' },
      { q: 'Can I use this tip calculator to split bills at Indian weddings or corporate events?', a: 'Yes. For large group meals at Indian weddings, corporate events, or team outings where the group shares a single bill, the calculator works with any bill size and up to 20 people. For example, a ₹45,000 catering bill for 30 guests with a 10% tip = ₹4,500 tip, ₹49,500 total, ₹1,650 per person. At corporate events and client dinners, a 10–15% tip is typical for hotel restaurant service. Many corporate expense policies allow restaurant gratuity up to 15% — keeping your tip within this range ensures smooth reimbursement.' },
    ],
  },

  'ppf-calculator': {
    description: 'AWE-OS PPF Calculator is a free online tool for Indian investors to compute the maturity value of a Public Provident Fund (PPF) account. PPF is a government-backed, long-term savings scheme managed through Post Office and designated bank branches at State Bank of India (SBI), Punjab National Bank (PNB), Bank of Baroda, HDFC Bank, ICICI Bank, Axis Bank, and others. Introduced under the PPF Act 1968, it offers a tax-free return at the rate notified by the Ministry of Finance quarterly (currently 7.1% p.a. compounded annually for FY 2024-25) with a 15-year mandatory lock-in period, extendable in blocks of 5 years. Annual investments range from ₹500 (minimum) to ₹1.5 lakh (maximum). PPF enjoys Triple Tax Exemption (EEE status): investments qualify for Section 80C deduction (up to ₹1.5 lakh per year), interest earned is tax-free, and the maturity amount is fully exempt from income tax. The calculator shows year-by-year corpus growth, total interest earned, and the Section 80C tax benefit based on your income tax slab.',
    features: [
      'Calculates PPF maturity value using the government-notified compounding formula for annual deposits',
      'Year-by-year breakdown showing opening balance, annual deposit, interest for the year, and closing balance',
      'Section 80C tax benefit calculation showing actual tax saved based on your selected income tax slab (5%, 20%, 30%)',
      'Partial withdrawal and loan eligibility information displayed for each year (withdrawals allowed from Year 7)',
      'Extension calculation — shows corpus if the account is extended for 5 or 10 additional years after 15 years',
      'Comparison with FD returns at equivalent bank FD rates for the same tenure and deposit amount',
    ],
    useCases: [
      'Salaried employees in the 30% tax bracket maximising Section 80C deductions of ₹1.5 lakh annually through PPF for both tax saving and long-term wealth creation',
      'Parents opening a PPF account in their minor child\'s name to build a corpus for higher education 15–18 years away with guaranteed government-backed returns',
      'Self-employed professionals and freelancers without EPF/PF coverage using PPF as their primary retirement savings vehicle',
      'Conservative investors comparing PPF returns against Fixed Deposits and RBI Floating Rate Bonds for the same 15-year horizon',
    ],
    howToUse: [
      'Enter your planned annual PPF deposit amount — the minimum is ₹500 and maximum is ₹1.5 lakh per financial year (April to March)',
      'Select your investment start year and the calculator will project the 15-year maturity date accordingly',
      'The current PPF interest rate (7.1% for FY 2024-25, as notified by Ministry of Finance) is pre-filled but can be adjusted',
      'Select your income tax slab (0%, 5%, 20%, or 30%) to calculate the actual tax saved annually under Section 80C',
      'Review the year-by-year table showing your corpus growth, total interest earned, and cumulative tax savings over 15 years',
    ],
    whyUseUs: [
      'Section 80C tax benefit calculator included — shows actual rupee tax savings per year based on your tax slab, which basic PPF calculators never compute. The tax saving effectively boosts your net yield well above the nominal 7.1%',
      'Year-by-year amortisation table shows partial withdrawal eligibility (from Year 7) and loan-against-PPF eligibility (from Year 3), helping you understand the liquidity profile of your investment',
      'Uses the government-mandated annual compounding formula with the officially notified rate for the current financial year — accurate for Indian PPF accounting',
    ],
    faqs: [
      { q: 'What is the current PPF interest rate in India?', a: 'The PPF interest rate for FY 2024-25 (April 2024 to March 2025) is 7.1% per annum, compounded annually. The rate is notified by the Ministry of Finance quarterly and has been stable at 7.1% since April 2020. Historically, PPF rates have ranged from 4% (in the 1960s) to 12% (in the 1980s and 1990s). The rate was 8% in FY 2016-17, 7.9% in FY 2017-18, and gradually reduced to the current 7.1%. Changes to the rate, if any, are announced at the start of each quarter.' },
      { q: 'Can I withdraw money from PPF before 15 years?', a: 'PPF has a mandatory 15-year lock-in, but partial withdrawals are permitted from the 7th financial year of the account. You can withdraw up to 50% of the balance at the end of the 4th year (i.e., two years before the withdrawal date) or 50% of the balance at the end of the immediately preceding year — whichever is lower. Only one withdrawal is permitted per financial year. For medical emergencies and higher education, you can take a loan against PPF from the 3rd to the 6th year (loan amount = 25% of balance at end of 2nd preceding year).' },
      { q: 'Is PPF better than ELSS mutual funds for tax saving?', a: 'PPF and ELSS (Equity Linked Saving Scheme) are both popular Section 80C instruments but suit different investor profiles. PPF offers guaranteed, government-backed returns at 7.1% with a 15-year lock-in (partial withdrawal from Year 7) and full tax-free EEE status. ELSS invests in equity markets and has a shorter 3-year lock-in, but returns are market-linked — historically 12–15% CAGR over long periods, though not guaranteed. Long-term capital gains from ELSS above ₹1 lakh per year are taxed at 10%. PPF is better for risk-averse investors, while ELSS is better for those who can tolerate market volatility for potentially higher inflation-beating returns.' },
    ],
  },

  'tax-calculator': {
    description: 'AWE-OS Income Tax Calculator is a free online tool for Indian taxpayers to estimate their income tax liability for FY 2024-25 (Assessment Year 2025-26) under both the New Tax Regime (default regime as per Finance Act 2023) and the Old Tax Regime with deductions. The New Tax Regime offers lower tax rates but removes most deductions (HRA, 80C, 80D, home loan interest). The Old Tax Regime has higher base rates but allows deductions including Standard Deduction of ₹50,000, HRA exemption, Section 80C investments up to ₹1.5 lakh, Section 80D health insurance premium up to ₹25,000, and home loan interest under Section 24(b) up to ₹2 lakh. The calculator compares the tax payable under both regimes side by side, helping you decide which regime results in lower tax for your specific income and deduction profile. It incorporates the applicable surcharge for incomes above ₹50 lakh and ₹1 crore, and the 4% Health and Education Cess on total tax.',
    features: [
      'Side-by-side comparison of tax under New Tax Regime vs Old Tax Regime for FY 2024-25',
      'New regime slabs: 0% up to ₹3L, 5% from ₹3L–₹7L, 10% from ₹7L–₹10L, 15% from ₹10L–₹12L, 20% from ₹12L–₹15L, 30% above ₹15L',
      'Old regime deductions: Standard Deduction ₹50,000, Section 80C up to ₹1.5L, Section 80D up to ₹25,000, HRA, and home loan interest Section 24(b)',
      'Surcharge calculation for high incomes: 10% for ₹50L–₹1Cr, 15% for ₹1Cr–₹2Cr, and 25% for ₹2Cr–₹5Cr',
      '4% Health and Education Cess automatically added on total tax and surcharge',
      'Rebate under Section 87A for incomes up to ₹7 lakh under new regime (full tax rebate) and ₹5 lakh under old regime',
    ],
    useCases: [
      'Salaried employees comparing New vs Old tax regime before submitting their investment declaration to HR at the start of the financial year',
      'Freelancers and self-employed professionals with business income calculating advance tax liability under Section 208 for quarterly payment',
      'NRIs with Indian income sources (rent, dividends, capital gains) understanding their Indian tax obligation for the financial year',
      'Students and first-time earners who have just entered the workforce understanding their tax liability and planning investments for Section 80C deductions',
    ],
    howToUse: [
      'Enter your gross annual income (CTC for salaried, or total business income for self-employed) in Indian Rupees (₹)',
      'Under Old Regime, enter your deductions: HRA received, actual HRA paid, city type (metro/non-metro), Section 80C investments (PPF, ELSS, LIC, home loan principal), Section 80D health insurance premiums, and home loan interest',
      'The calculator automatically computes taxable income, tax payable, surcharge, cess, and net tax under both regimes',
      'Compare the two columns side by side — the regime with lower net tax is highlighted as the recommended choice for your income profile',
      'Use the result to make your regime declaration to your employer (Form 10-IEA if choosing old regime) at the start of the financial year',
    ],
    whyUseUs: [
      'New vs Old regime comparison in a single view — the most important decision Indian taxpayers face each year, answered instantly without separate spreadsheets or manual calculations',
      'Accurate surcharge and marginal relief calculation for high-income individuals above ₹50 lakh — most basic tax calculators ignore the surcharge which can significantly affect effective tax rates',
      'Section 87A rebate correctly applied for both regimes (₹25,000 rebate under new regime for income up to ₹7L; ₹12,500 under old regime for income up to ₹5L)',
    ],
    faqs: [
      { q: 'What are the income tax slabs under the New Tax Regime for FY 2024-25?', a: 'Under the New Tax Regime (default from FY 2023-24), the tax slabs are: Income up to ₹3 lakh — Nil; ₹3 lakh to ₹7 lakh — 5%; ₹7 lakh to ₹10 lakh — 10%; ₹10 lakh to ₹12 lakh — 15%; ₹12 lakh to ₹15 lakh — 20%; above ₹15 lakh — 30%. A Standard Deduction of ₹50,000 (₹75,000 from FY 2024-25 as per Budget 2024) is available under the New Regime for salaried employees. Section 87A rebate of ₹25,000 makes income up to ₹7 lakh effectively tax-free under the new regime.' },
      { q: 'Should I choose New Tax Regime or Old Tax Regime?', a: 'The New Regime is generally better if your total deductions under the old regime are less than the break-even threshold — approximately ₹3.75 lakh for incomes around ₹15 lakh. If your Section 80C investments (₹1.5L), health insurance (₹25,000), home loan interest (₹2L), and HRA exemption together exceed ₹3.75 lakh, the Old Regime may result in lower tax. The easiest approach is to use the AWE-OS tax calculator to compute both and compare the net tax payable with your actual deductions filled in.' },
      { q: 'What is the Indian financial year and when is the ITR filing deadline?', a: 'India\'s financial year (FY) runs from April 1st to March 31st. FY 2024-25 covers April 1, 2024 to March 31, 2025. The corresponding Assessment Year (AY) is AY 2025-26. The deadline for filing Income Tax Return (ITR) for salaried individuals is typically July 31st of the Assessment Year (July 31, 2025 for AY 2025-26). For businesses requiring audit, the deadline is October 31st. Revised returns can be filed up to December 31st of the assessment year. Late filing attracts a fee of ₹5,000 (₹1,000 if income is below ₹5 lakh) under Section 234F.' },
    ],
  },

  'discount-calculator': {
    description: 'AWE-OS Discount Calculator is a free online tool that instantly computes sale prices, discount amounts, and savings for any percentage or flat discount. It works in three modes: (1) Calculate the discounted price from an original price and discount percentage — useful for online shopping on Amazon, Flipkart, or Myntra where products show "40% off" or "Flat ₹500 off"; (2) Find what percentage discount you received — useful for comparing deals across platforms; and (3) Find the original price from a discounted price and the discount percentage — useful for checking whether a "sale price" is genuinely discounted or artificially inflated. The tool is simple, instant, and requires no account. It is particularly popular among Indian shoppers during Flipkart Big Billion Days, Amazon Great Indian Festival, Myntra End of Reason Sale, and other major sale events where comparing multiple discount structures across competing products can be time-consuming.',
    features: [
      'Three calculation modes: Discounted Price, Discount Percentage, and Original Price (reverse calculation)',
      'Percentage discount calculation: enter original price and discount % to see final price and amount saved',
      'Flat discount calculation: enter original price and flat discount amount to compute the effective percentage off',
      'Reverse discount: enter sale price and discount % to find what the original price was',
      'Stacked discount calculation: apply two successive discounts (e.g., 20% off then additional 10% off) to see effective total discount',
      'Savings amount and percentage displayed prominently alongside the final discounted price',
    ],
    useCases: [
      'Online shoppers on Amazon India, Flipkart, and Myntra comparing discount offers across multiple products during sale events to find the best deal',
      'Retail store owners and e-commerce sellers computing sale prices and ensuring advertised discounts are accurately reflected in billing',
      'Students and commerce trainees learning profit-loss and discount calculations for school and competitive exam problems',
      'Business procurement teams validating vendor invoice discounts against purchase order terms before approving payment',
    ],
    howToUse: [
      'Select the calculation mode: "Find Sale Price" to compute the discounted amount, "Find Discount %" to determine the percentage off, or "Find Original Price" for reverse calculation',
      'Enter the required values — for "Find Sale Price": original price and discount percentage; for "Find Discount %": original and sale prices; for "Find Original Price": sale price and discount percentage',
      'The result appears instantly — the discounted price, discount amount, and savings percentage are all displayed',
      'For stacked discounts (e.g., 20% off and then an additional 10% off on the discounted price), enter the first discounted price and apply the second discount to compute the final price',
      'Use the result for price comparison or to verify that a billing system has applied the correct discount',
    ],
    whyUseUs: [
      'Three calculation modes in one tool — find discounted price, find what percentage was applied, or reverse-calculate the original price, without switching between different tools',
      'Stacked discount support reveals why "20% + 10% off" is not the same as 30% off (it equals 28% total) — a common confusion that leads to incorrect price comparisons',
      'Free, instant, and mobile-friendly — works from any device during in-store shopping or while comparing deals on your phone',
    ],
    faqs: [
      { q: 'How do I calculate 30% off on a price?', a: 'To calculate 30% off, multiply the original price by 0.30 to get the discount amount, then subtract from the original price. For example: ₹2,500 original price × 0.30 = ₹750 discount. Final price = ₹2,500 − ₹750 = ₹1,750. Equivalently, multiply the original price by 0.70 (which is 1 − 0.30) to go directly to the final price: ₹2,500 × 0.70 = ₹1,750. The AWE-OS Discount Calculator does this computation instantly when you enter the original price and discount percentage.' },
      { q: 'Are stacked discounts the same as a combined discount?', a: 'No. Stacked (successive) discounts are not the same as a combined discount. For example, "20% off and then an additional 10% off" is not 30% off. The calculation is: first apply 20% discount: ₹1,000 × 0.80 = ₹800. Then apply 10% off on ₹800: ₹800 × 0.90 = ₹720. Total saving = ₹1,000 − ₹720 = ₹280, which is 28% — not 30%. This distinction matters when comparing deals during sale events where different platforms stack discounts in different ways.' },
      { q: 'How do I find the original price if I only know the sale price and discount percentage?', a: 'If you know the sale price and the discount percentage, the original price = Sale Price ÷ (1 − Discount/100). For example, if a product is selling at ₹840 after a 30% discount: Original Price = ₹840 ÷ (1 − 0.30) = ₹840 ÷ 0.70 = ₹1,200. This reverse calculation is useful for checking whether a seller has inflated the "original price" before applying a discount — a common practice during Indian online sale events.' },
    ],
  },

  'gpa-calculator': {
    description: 'AWE-OS GPA Calculator is a free online tool for Indian university and college students to calculate their Grade Point Average (GPA), Cumulative Grade Point Average (CGPA), and equivalent percentage. Most Indian universities including IITs, NITs, IIITs, BITS Pilani, DU, Mumbai University, Pune University, VTU, and Anna University use a 10-point grading scale where a CGPA of 10.0 is the highest. The calculator supports credit-weighted GPA computation — where subjects with more credits (typically core engineering or medical subjects) carry more weight than low-credit electives. Enter each subject\'s grade point and credit hours, and the calculator computes the weighted GPA for that semester. Add multiple semesters to compute your overall CGPA across all semesters. It also converts CGPA to percentage using the standard Indian formula (CGPA × 9.5 for Anna University, CGPA × 10 − 7.5 for most others) so you can express your academic score on job applications and university admission forms that ask for percentage.',
    features: [
      'Credit-weighted GPA and CGPA calculation on a 10-point scale as used by IITs, NITs, and most Indian universities',
      'Add unlimited subjects per semester with individual grade points (10, 9, 8, 7, etc.) and credit hours',
      'Multi-semester CGPA calculation — enter all semesters to get the overall cumulative GPA',
      'CGPA to percentage conversion using multiple formula options (Anna University, VTU, Mumbai University, general formula)',
      'Grade point to letter grade reference table for common Indian university grading systems (O, A+, A, B+, B, C, F)',
      'SGPA (Semester GPA) calculated per semester alongside the cumulative CGPA across all entered semesters',
    ],
    useCases: [
      'Engineering students at NITs and IITs tracking semester SGPA and overall CGPA for placement eligibility (most companies require minimum 6.5 or 7.0 CGPA)',
      'Medical and pharmacy students calculating CGPA for internship applications and postgraduate entrance exam eligibility',
      'Students applying to foreign universities (US, UK, Canada, Australia) who need to convert their Indian CGPA to a 4.0 GPA scale for applications',
      'MBA aspirants computing their undergraduate CGPA to meet the minimum eligibility criteria for IIM CAT and other business school applications',
    ],
    howToUse: [
      'Enter the number of subjects in your current semester and add each subject with its grade point (typically 4 to 10) and credit hours',
      'Click "Calculate SGPA" to see the Semester GPA computed as the weighted average: sum of (grade point × credits) divided by total credits',
      'Add additional semesters using the "Add Semester" button, entering subjects and grades for each semester',
      'Click "Calculate CGPA" to see the overall cumulative GPA across all semesters you have entered',
      'Select your university\'s percentage conversion formula to convert your CGPA to an equivalent percentage for applications and interviews',
    ],
    whyUseUs: [
      'Multi-semester CGPA tracking in one session — add all your semesters to get the true cumulative GPA without recalculating from scratch each time',
      'Multiple percentage conversion formulas for different Indian universities — Anna University uses CGPA × 9.5, VTU and many others use (CGPA × 10) − 7.5, avoiding the confusion of applying the wrong formula',
      'Free, instant, and works in any browser with no login — use it before placement drives, scholarship applications, or foreign university admissions to quickly verify your CGPA',
    ],
    faqs: [
      { q: 'How do I convert CGPA to percentage for Indian universities?', a: 'The conversion formula varies by university. Anna University (Chennai): Percentage = CGPA × 9.5. VTU (Karnataka) and many central universities: Percentage = (CGPA × 10) − 7.5. Mumbai University: Percentage = (CGPA − 0.5) × 10. IITs do not have a standard percentage conversion since their placement drives accept CGPA directly. For general purposes, the most commonly used formula in India is Percentage = CGPA × 9.5, which gives a percentage of 85.5% for a CGPA of 9.0 on the 10-point scale.' },
      { q: 'What CGPA is required for placements at top Indian companies?', a: 'Most large Indian companies (TCS, Infosys, Wipro) have a minimum CGPA cutoff of 6.0–6.5. Product-based companies (Google, Microsoft, Amazon, Flipkart, Adobe) typically require a minimum CGPA of 7.0–7.5 for shortlisting. Core engineering companies (L&T, BHEL, ISRO, DRDO) often require 6.5–7.0. Government sector PSUs through GATE have varying CGPA requirements but typically 6.0 minimum for graduation. MBA programmes like IIMs require a minimum graduation percentage of 50% (45% for reserved categories) — usually corresponding to a CGPA of approximately 5.5–6.0 on the 10-point scale.' },
      { q: 'How do I convert my 10-point Indian CGPA to a 4.0 GPA scale for US university applications?', a: 'US universities and the World Education Services (WES) typically convert Indian 10-point CGPA to a 4.0 GPA using the formula: GPA (4.0 scale) = (CGPA / 10) × 4. So a CGPA of 8.0 converts to 3.2 on the 4.0 scale, and a CGPA of 9.0 converts to 3.6. However, many top US universities (MIT, Stanford, Harvard) do their own holistic evaluation of international transcripts and do not blindly apply this formula. It is recommended to report your CGPA on the 10-point scale alongside the conversion rather than only reporting the 4.0 equivalent.' },
    ],
  },

  'fd-calculator': {
    description: 'AWE-OS FD Calculator is a free online tool for Indian investors to compute the maturity amount, total interest earned, and post-TDS returns on Fixed Deposit investments at any bank or NBFC. Fixed Deposits are one of the most popular savings instruments in India, offered by all scheduled commercial banks including State Bank of India (SBI), HDFC Bank, ICICI Bank, Axis Bank, Kotak Mahindra Bank, Punjab National Bank (PNB), Bank of Baroda, and small finance banks like AU Small Finance Bank and ESAF Small Finance Bank. The calculator supports all compounding frequencies — monthly, quarterly (standard for most Indian bank FDs), half-yearly, and annually — and displays both the gross maturity amount and the net amount after deducting TDS (Tax Deducted at Source) at 10% on interest income exceeding ₹40,000 per year (₹50,000 for senior citizens). Senior citizens receive a 0.25%–0.50% additional interest rate benefit, and the calculator includes a senior citizen rate toggle. For the Indian financial year (April to March), FD interest is taxable as "Income from Other Sources" at your applicable tax slab rate.',
    features: [
      'Computes FD maturity amount using compound interest for all compounding frequencies: monthly, quarterly, half-yearly, and annual',
      'TDS calculation: automatically deducts 10% TDS on interest above ₹40,000/year (₹50,000 for senior citizens) as per Income Tax Act',
      'Senior citizen rate toggle: adds 0.25%–0.50% additional interest (exact additional rate configurable) as offered by most Indian banks',
      'Effective annual yield (EAR) calculation to compare FDs with different compounding frequencies on a common basis',
      'Bank comparison table showing current FD rates at SBI, HDFC, ICICI, Axis, Kotak, and PNB for popular tenures',
      'Tax-saving FD calculation for 5-year lock-in FDs qualifying for Section 80C deduction up to ₹1.5 lakh',
    ],
    useCases: [
      'Retired individuals and senior citizens at SBI or HDFC Bank comparing FD interest rates across tenure options (1 year, 3 years, 5 years) to maximise post-tax returns on savings',
      'Salaried professionals in the 30% tax bracket evaluating whether a 5-year tax-saving FD (Section 80C) or ELSS mutual fund gives better net post-tax returns',
      'Investors comparing quarterly-compounding FDs against monthly-compounding recurring deposits using the effective annual yield to find the better deal',
      'Businesses parking surplus funds in short-term FDs (7 days to 1 year) and computing the expected interest income for cash flow planning',
    ],
    howToUse: [
      'Enter the FD principal amount — the amount you plan to deposit — in Indian Rupees (₹)',
      'Enter the annual interest rate offered by the bank (e.g., 6.5% for SBI 1-year FD, 7.1% for AU Small Finance Bank)',
      'Select the FD tenure in years and months, and the compounding frequency (quarterly is standard for most Indian bank FDs)',
      'Toggle the Senior Citizen rate if applicable — enter the additional rate (typically 0.25%–0.50%) offered by your bank',
      'The calculator shows the gross maturity amount, total interest earned, TDS deducted, and net maturity value after TDS',
    ],
    whyUseUs: [
      'TDS-aware calculation shows net post-TDS maturity value — most FD calculators show only gross returns, which is misleading since TDS of 10% is deducted at source on interest exceeding ₹40,000 per year, significantly reducing effective returns',
      'Senior citizen rate support with configurable additional rate — important since senior citizens receive 0.25%–0.50% extra across most banks, making a meaningful difference over 3–5 year FD tenures',
      'Effective Annual Rate (EAR) calculation lets you accurately compare monthly-compounding vs quarterly-compounding FDs, revealing that a 6.5% monthly-compounding FD yields more than a 6.5% quarterly-compounding FD',
    ],
    faqs: [
      { q: 'What are the current FD interest rates at major Indian banks?', a: 'FD interest rates vary by bank and tenure. As of early 2025, indicative rates for a 1-year FD are approximately: SBI 6.80%, HDFC Bank 6.60%, ICICI Bank 6.70%, Axis Bank 6.70%, Kotak Mahindra Bank 7.10%. Small Finance Banks offer higher rates: AU Small Finance Bank 7.50%, ESAF Small Finance Bank 7.75%, Jana Small Finance Bank 7.25%. Post Office Time Deposit (1 year) offers 6.90%. Rates change periodically and vary by tenure — always check your bank\'s official website for the current rate before investing.' },
      { q: 'How is TDS deducted on FD interest in India?', a: 'Banks deduct TDS (Tax Deducted at Source) at 10% on FD interest if the total interest income from that bank exceeds ₹40,000 in a financial year (₹50,000 for senior citizens). If your annual income is below the basic exemption limit, you can submit Form 15G (for those below 60 years) or Form 15H (for senior citizens 60+) to your bank at the start of each financial year to prevent TDS deduction. TDS is reflected in your Form 26AS and can be claimed as credit when filing your ITR. If your actual tax slab is higher than 10%, you must pay additional self-assessment tax.' },
      { q: 'Is a 5-year tax-saving FD worth it for Section 80C?', a: 'A 5-year tax-saving FD is eligible for Section 80C deduction up to ₹1.5 lakh per year. For someone in the 30% tax bracket, investing ₹1.5 lakh in a tax-saving FD at 6.5% saves ₹46,800 in tax immediately (plus 4% cess), effectively boosting the net return. However, the interest earned on tax-saving FDs is fully taxable each year, which erodes the benefit. Compare against ELSS mutual funds (same ₹1.5 lakh 80C limit, 3-year lock-in, historically higher returns but market-linked) and PPF (7.1% guaranteed, EEE tax status, 15-year lock-in) before deciding.' },
    ],
  },

  'roi-calculator': {
    description: 'AWE-OS ROI Calculator is a free online tool that computes Return on Investment (ROI) as a percentage for any investment — stocks, mutual funds, real estate, fixed deposits, business investment, or cryptocurrency. It calculates both simple ROI (total return percentage) and Annualized ROI (also called CAGR — Compound Annual Growth Rate) which adjusts for the holding period and allows fair comparison of investments held for different durations. For Indian investors, this tool is essential for comparing the return from a house purchased in 2018 with a mutual fund SIP started in the same year, or evaluating whether a lump-sum stock investment in Nifty 50 has outperformed an FD over the same period. Simply enter the initial investment amount, the current or exit value, and the investment duration in years. The tool displays simple ROI %, annualized CAGR %, and the absolute gain or loss in rupees — with clear indicators for profitable and loss-making scenarios.',
    features: [
      'Simple ROI calculation: (Final Value − Initial Investment) ÷ Initial Investment × 100',
      'Annualized ROI (CAGR): (Final Value ÷ Initial Value)^(1/years) − 1 for multi-year investment comparison',
      'Absolute gain/loss in rupees displayed alongside percentage return',
      'Multiple investment comparison — enter up to 4 investments side by side to identify the best performer',
      'Break-even analysis showing when an investment at a given return rate will double (Rule of 72)',
      'Investment growth projection showing what ₹1 lakh grows to over 5, 10, 15, and 20 years at the computed CAGR',
    ],
    useCases: [
      'Stock market investors calculating actual CAGR on Nifty 50, individual stocks, or sectoral funds from purchase date to current value',
      'Real estate investors computing annualized return on a property investment including purchase price, renovation costs, and current resale value',
      'Business owners measuring annual ROI on capital investments like machinery, IT infrastructure, or marketing campaigns',
      'Mutual fund investors comparing CAGR of different fund categories (large-cap, mid-cap, ELSS) over the same holding period to rebalance their portfolio',
    ],
    howToUse: [
      'Enter the initial investment amount in rupees — this is the total cost including any transaction fees or purchase costs',
      'Enter the current value or exit value of the investment — for ongoing investments, use the current market value',
      'Enter the investment duration in years and months',
      'Click "Calculate ROI" to see the simple ROI percentage, annualized CAGR, and absolute profit or loss',
      'Use the comparison table to enter up to 4 different investments and identify which has the highest annualized return',
    ],
    whyUseUs: [
      'CAGR calculation alongside simple ROI — simple ROI alone is misleading for investments held for different periods; CAGR normalises returns to an annual basis, enabling fair comparison between a 2-year and a 7-year investment',
      'Multi-investment comparison table lets you see up to 4 assets side by side — instantly shows which of your equity, debt, real estate, or gold investments has performed best',
      'Free, instant, browser-based tool with no login required — compute returns for any asset class without being locked into a brokerage or bank platform\'s analytics',
    ],
    faqs: [
      { q: 'What is the difference between ROI and CAGR?', a: 'ROI (Return on Investment) measures the total percentage gain or loss from the initial investment to the exit or current value, without regard for the time taken. CAGR (Compound Annual Growth Rate) is the annualized ROI — it expresses the same total return as if the investment had grown at a steady compounding rate each year. For example: an investment that doubled in 5 years has an ROI of 100% but a CAGR of approximately 14.9% per year. CAGR is more useful for comparing investments held for different durations, which is why it is the standard metric for mutual fund and equity return comparisons.' },
      { q: 'What is a good ROI for investments in India?', a: 'In India, long-term benchmarks are: Fixed Deposits 6–7.5% CAGR; PPF 7.1% (guaranteed); Nifty 50 historical long-term average approximately 12–14% CAGR; Nifty Midcap 100 approximately 14–17% CAGR; real estate in metros approximately 6–10% CAGR (varies widely by city, location, and market cycle); gold approximately 10–12% CAGR over 20-year periods in INR terms. For business investments, a minimum ROCE (Return on Capital Employed) of 15–20% is generally considered healthy for Indian businesses. Anything above the risk-free rate (currently approximately 6.5–7% for 10-year government bond yields) represents genuine value creation.' },
      { q: 'How do I calculate ROI on a real estate investment in India?', a: 'For real estate ROI: Total Initial Cost = Purchase Price + Stamp Duty and Registration (5–7% of property value) + Brokerage (1–2%) + Renovation or Interior Costs. Annual Rental Income = Monthly Rent × 12. Rental Yield = Annual Rental Income ÷ Total Initial Cost × 100. Capital Appreciation ROI = (Current Market Value − Total Initial Cost) ÷ Total Initial Cost × 100. Total ROI over N years = Capital Appreciation % + (Rental Yield × N years). Use the CAGR formula for the annualized return. Note that capital gains from property sold after 2 years are taxed as Long-Term Capital Gains (LTCG) at 12.5% without indexation benefit from FY 2024-25 onwards.' },
      { q: 'How do I calculate ROI on Indian stock market investments — Nifty 50 or individual stocks?', a: 'For Nifty 50 index investments through index funds or ETFs: Initial Investment = purchase NAV × units purchased. Current Value = current NAV × units held. ROI (%) = (Current Value − Initial Investment) ÷ Initial Investment × 100. CAGR = (Current Value ÷ Initial Investment)^(1/years) − 1. Example: ₹1 lakh invested in Nifty 50 ETF in January 2019 at NAV of approximately ₹98 = 1,020 units. Current NAV in January 2024 (approximately ₹195) = current value of ₹1,98,900. Simple ROI = 98.9%. CAGR over 5 years = (1.989)^(1/5) − 1 = approximately 14.8% per year. Note: dividends and bonus shares, if received, should be added to the current value for accurate total return calculation. For direct equity stocks, include brokerage (0.03–0.05% per trade at Zerodha/Groww), STT (0.1% on delivery trades), and LTCG tax (10% above ₹1 lakh per year) in your cost basis and net return computation.' },
      { q: 'How do I compare ROI across different asset classes like gold, FD, and equity?', a: 'To compare ROI across asset classes fairly, always use CAGR (Compound Annual Growth Rate) over the same time period, not simple ROI. Indian asset class historical CAGR benchmarks (approximate 10-year averages as of 2024): Nifty 50 — 13–15% CAGR; Gold (in INR) — 10–12% CAGR; SBI Fixed Deposit — 6–7% CAGR; PPF — 7.1% (current guaranteed rate); Real estate in metros — 6–10% CAGR (highly location-dependent); RBI Floating Rate Bond — 7.35% (current rate). Use the AWE-OS ROI Calculator\'s multi-investment comparison feature to enter your actual purchase price and current value for each asset and compare CAGR side by side. Remember that equity and real estate have higher volatility and tax implications compared to FD and PPF, so risk-adjusted return (Sharpe ratio) is more meaningful for rigorous comparison than raw CAGR.' },
    ],
  },

  'age-calculator': {
    description: 'AWE-OS Age Calculator is a free online tool that computes your exact age in years, months, and days from your date of birth to today or any specified target date. It handles leap years correctly, accounts for varying month lengths (28, 29, 30, and 31 days), and provides multiple output formats including total days lived, weeks lived, months lived, and hours since birth. The tool is widely used in India for filling insurance proposal forms that require exact age at last birthday, passport and visa applications where age must be calculated to a specific date, retirement planning where the number of working years remaining needs to be precise, and Aadhaar or government form submissions that ask for date of birth verification. It also calculates the number of days until your next birthday and shows which day of the week you were born. A secondary Date Difference feature lets you calculate the gap between any two dates — useful for calculating contract duration, loan tenure, project timelines, and age gaps.',
    features: [
      'Exact age calculation in years, months, and days accounting for leap years and variable month lengths',
      'Multiple output formats: total days lived, weeks, months, and approximate hours since birth',
      'Next birthday countdown showing days remaining until the next birthday',
      'Day of week determination — shows which day of the week you were born',
      'Date difference calculator for computing duration between any two dates in years, months, and days',
      'Age on a future or past target date — calculate how old you will be on a specific date or how old you were on a historical date',
    ],
    useCases: [
      'Insurance applicants filling LIC, HDFC Life, or Max Life proposal forms that require exact age at last birthday for premium calculation and eligibility checks',
      'Job applicants checking exact age for government recruitment age limits (UPSC: 21–32 years for general category; SSC CGL: 18–32 years) calculated to the last date of application',
      'NRIs and travellers calculating the number of days spent in India for tax residency determination (183-day rule for NRI/RNOR/Resident status under Income Tax Act)',
      'Students and parents verifying age eligibility for school admissions where the cutoff date (June 1st for many CBSE schools) requires precise age at entry',
    ],
    howToUse: [
      'Enter your date of birth in the day, month, and year fields — or use the date picker to select from a calendar',
      'The calculator automatically uses today\'s date as the reference date, showing your current age in years, months, and days',
      'To find your age on a specific past or future date, toggle "Calculate age on a specific date" and enter the target date',
      'Check the additional outputs: total days lived, next birthday countdown, and the day of the week you were born',
      'Use the Date Difference tab to calculate the duration between any two dates — enter start and end dates to get the gap in years, months, and days',
    ],
    whyUseUs: [
      'Leap year-accurate calculation — many basic age calculators incorrectly handle birthdays on February 29 or calculate month boundaries incorrectly when the birth day is greater than the days in the current month',
      'Multiple output formats (days, weeks, months, years + months + days) in one view — eliminates the need to use separate date difference tools for insurance forms, visa applications, and government age eligibility checks',
      'Free, instant, and privacy-preserving — your date of birth is processed locally in your browser and never transmitted to any server',
    ],
    faqs: [
      { q: 'How is exact age calculated for insurance and government forms?', a: 'For LIC and most Indian life insurance policies, "age at last birthday" means the number of complete years since birth — so a person born on March 15, 2000 would be recorded as 24 years old on November 30, 2024, even though they will turn 25 in March 2025. For UPSC and government recruitments, age is typically calculated as of the last date for submitting applications, and candidates are required to have not exceeded the maximum age limit on that specific date. The AWE-OS Age Calculator computes age as of today by default, but you can specify any target date for eligibility checking.' },
      { q: 'How many days qualify me as an Indian resident for tax purposes?', a: 'Under the Income Tax Act, an individual is a Resident of India for a financial year if they spend 182 days or more in India during that year (April 1 to March 31). Previously, the threshold was 60 days in the current year plus 365 days across the preceding 4 years for certain categories, but this was simplified. NRIs earning income in India are taxed only on India-sourced income, while Residents are taxed on global income. The AWE-OS Date Difference calculator can help count the number of days spent in India during a financial year by calculating gaps between arrival and departure dates.' },
      { q: 'What day of the week was I born on?', a: 'The AWE-OS Age Calculator automatically displays the day of the week for your entered date of birth using the Tomohiko Sakamoto algorithm for day-of-week calculation. This works for any date from 1 January 0001 to 31 December 9999. It is a common fun trivia question at family gatherings but also has practical uses — some religions and cultures assign significance to the day of the week at birth, and certain historical event verification requires knowing the day.' },
    ],
  },

  'loan-calculator': {
    description: 'AWE-OS Loan Calculator (EMI Calculator) is a free online tool for Indian borrowers to compute the Equated Monthly Instalment (EMI) for home loans, car loans, personal loans, education loans, and gold loans. The EMI formula used is the standard reducing balance method: EMI = P × r × (1+r)^n ÷ [(1+r)^n − 1], where P is the principal, r is the monthly interest rate (annual rate ÷ 12), and n is the tenure in months. The calculator shows not just the EMI amount but also a full amortisation schedule — the month-by-month breakdown of principal repaid and interest paid for every EMI, plus the outstanding balance after each payment. This is particularly useful for home loan borrowers at SBI, HDFC Bank, ICICI Bank, Axis Bank, and Bank of Baroda who want to understand how much of their early EMIs goes toward interest versus principal, and for planning prepayments to reduce total interest outflow. The tool also includes a prepayment calculator showing how a one-time prepayment reduces tenure and total interest paid.',
    features: [
      'EMI calculation using the standard reducing balance formula as used by all RBI-regulated banks and NBFCs in India',
      'Full amortisation schedule showing principal, interest, and outstanding balance for every month of the loan tenure',
      'Total interest outflow over the full loan tenure — the often-shocking "true cost" of a long-term loan',
      'Prepayment impact calculator: enter a one-time prepayment amount to see the new tenure and total interest saved',
      'Multiple loan comparison: compute EMIs for 2–3 different loan amounts or rates side by side',
      'Eligibility indicator: shows the minimum monthly income required to qualify for the entered loan amount based on standard 40–50% EMI-to-income ratio rules',
    ],
    useCases: [
      'Home loan applicants at SBI, HDFC Bank, or ICICI Bank planning affordability before applying, comparing 15-year vs 20-year tenure, and understanding the total interest cost',
      'Car buyers at dealerships evaluating dealer-arranged auto loan EMIs against direct bank or HDFC/ICICI financing options',
      'Personal loan borrowers comparing multiple lenders (BAJAJ Finserv, Tata Capital, SBI Personal Loan) on EMI and total cost basis',
      'Existing home loan borrowers considering balance transfer to a lower-rate bank or planning lump-sum prepayments to reduce their loan tenure',
    ],
    howToUse: [
      'Enter the loan principal amount (e.g., ₹50 lakh for a home loan, ₹8 lakh for a car loan, ₹5 lakh for a personal loan)',
      'Enter the annual interest rate — as of 2025, indicative rates are: SBI Home Loan 8.50%, HDFC Bank Car Loan 8.75–9.00%, SBI Personal Loan 11.15–14.50%',
      'Enter the loan tenure in years (home loans: 5–30 years; car loans: 1–7 years; personal loans: 1–5 years)',
      'Click "Calculate EMI" to see the monthly instalment, total amount payable, and total interest over the full tenure',
      'Scroll down to the amortisation table to see month-by-month principal and interest breakdown, and use the prepayment field to calculate tenure savings',
    ],
    whyUseUs: [
      'Full amortisation schedule included — reveals that in the first years of a long home loan, over 80% of each EMI goes toward interest and barely any reduces the principal, which is critical information for prepayment planning',
      'Prepayment impact calculator shows exactly how many months and how many rupees of interest are saved by a one-time prepayment — most bank EMI calculators do not show this',
      'Uses the standard RBI-regulated reducing balance formula (not flat rate) — some lenders quote flat rate loans which appear lower but are actually more expensive; this calculator always uses reducing balance for accurate comparison',
    ],
    faqs: [
      { q: 'What is the EMI on a ₹50 lakh home loan at 8.5% for 20 years?', a: 'Using the standard reducing balance formula: EMI = ₹50,00,000 × (8.5%÷12) × (1 + 8.5%÷12)^240 ÷ [(1 + 8.5%÷12)^240 − 1] = approximately ₹43,391 per month. Total amount payable over 20 years = ₹43,391 × 240 = approximately ₹1.04 crore. Total interest paid = ₹1.04 crore − ₹50 lakh = approximately ₹54.1 lakh — more than the original loan amount. This is why prepayment whenever possible significantly reduces total cost.' },
      { q: 'What is the difference between a flat rate and reducing balance rate for loans?', a: 'In a flat rate loan, interest is calculated on the original principal throughout the tenure. In a reducing balance loan (standard for most Indian bank loans), interest is calculated only on the outstanding principal, which decreases with each EMI payment. A flat rate of 7% is actually equivalent to an effective reducing balance rate of approximately 12.5–13% — nearly double. Always check whether the quoted rate is flat or reducing balance. Indian banks regulated by RBI are required to quote the Effective Interest Rate (EIR), but some NBFCs and informal lenders still use flat rates.' },
      { q: 'How much home loan EMI can I afford on my salary?', a: 'The standard RBI-recommended guideline is that EMI should not exceed 40–50% of your net monthly income (take-home salary after taxes and PF deductions). Banks typically use a Fixed Obligation to Income Ratio (FOIR) of 40–55% — the total of all existing EMIs plus the new loan EMI should be within this range. For example, on a net monthly income of ₹1 lakh, maximum advisable EMI = ₹40,000–₹50,000. At 8.5% for 20 years, a ₹40,000 EMI corresponds to a loan of approximately ₹46 lakh. This is a guideline — actual bank sanctioned amount also depends on credit score (CIBIL ≥ 750 preferred), employment stability, and existing obligations.' },
    ],
  },

  'percentage-calculator': {
    description: 'AWE-OS Percentage Calculator is a free online tool that handles four distinct percentage computation problems in one place: (1) What is X% of a number — finding a fraction of a total (e.g., what is 15% of ₹2,400?); (2) X is what percentage of Y — finding what portion one number is of another (e.g., 360 is what % of 2,400?); (3) Percentage change (increase or decrease) between two values — computing the growth or decline percentage (e.g., a price changed from ₹500 to ₹650 — what is the % increase?); and (4) Find the original value after a percentage change — reverse-calculating the base before a known percentage was applied (e.g., after a 25% increase, the value is ₹625 — what was the original?). Each mode is clearly labelled and accepts any numerical inputs. Results are displayed instantly with the formula shown so users understand the calculation rather than just getting an answer.',
    features: [
      'Four calculation modes: Find X% of Y, X is what % of Y, Percentage Change, and Reverse Percentage',
      'Percentage increase and decrease detection — automatically shows whether a change is positive (increase) or negative (decrease)',
      'Formula display alongside results — shows the arithmetic formula used so students can learn the method',
      'Decimal precision control — results shown to 2 decimal places with option for whole number rounding',
      'Percentage point vs percentage difference distinction — clarifies this commonly confused concept',
      'Instant calculation with no submit button — results update in real time as numbers are entered',
    ],
    useCases: [
      'Students solving percentage problems in school maths, quantitative aptitude sections of CAT/GMAT/GRE, or UPSC Preliminary exams where percentages are a high-frequency topic',
      'Shoppers calculating what percentage discount they received on a purchase, or what the final price is after a stated discount percentage',
      'Business analysts and managers computing month-on-month or year-on-year growth percentages for sales, revenue, or traffic metrics',
      'Investors tracking portfolio gains — computing the percentage return on individual stocks, mutual fund NAV changes, or gold price movements',
    ],
    howToUse: [
      'Select the calculation type from the four modes: "What is X% of Y", "X is what % of Y", "Percentage Change", or "Reverse Percentage"',
      'Enter the required numbers in the input fields — the labels update dynamically based on the selected mode',
      'The result appears instantly alongside the formula used for the calculation',
      'Switch between modes to perform different types of percentage calculations on the same or different numbers',
      'Use the copy button to copy the result to clipboard for use in reports, messages, or spreadsheets',
    ],
    whyUseUs: [
      'Four calculation modes in one tool eliminate the need to remember different formulas for different percentage problems — find %, find value, find change %, and reverse-calculate original value all in the same interface',
      'Formula display alongside results makes this a learning tool, not just an answer machine — students preparing for competitive exams benefit from seeing the calculation method',
      'Instant real-time calculation with no submit button — faster than any other approach for quick percentage checks during shopping, meetings, or exam practice',
    ],
    faqs: [
      { q: 'How do I calculate percentage increase from one value to another?', a: 'Percentage Increase = [(New Value − Old Value) ÷ Old Value] × 100. For example, if a product price increased from ₹500 to ₹650: Percentage Increase = [(₹650 − ₹500) ÷ ₹500] × 100 = [₹150 ÷ ₹500] × 100 = 30%. If the new value is lower than the old value, the result is a percentage decrease. For example, from ₹500 to ₹400: [(₹400 − ₹500) ÷ ₹500] × 100 = −20% (a 20% decrease). The AWE-OS Percentage Calculator automatically detects and labels increase vs decrease.' },
      { q: 'What is the difference between percentage change and percentage point change?', a: 'Percentage change and percentage point change are often confused but measure different things. Percentage change is the relative change as a fraction of the original: if interest rates go from 6% to 8%, the percentage change is (8−6)÷6 × 100 = 33.3% increase. Percentage point change is the absolute arithmetic difference: 8% − 6% = 2 percentage points increase. Politicians and media sometimes use "percentage points" and "percent" interchangeably, which can be misleading. For exam purposes: "rates rose by 2 percentage points" is different from "rates rose by 2%" (which would be from 6% to 6.12%).' },
      { q: 'How do I find the original price if I know the discounted price and the discount percentage?', a: 'If the discounted price is known and the discount percentage is D%, the original price = Discounted Price ÷ (1 − D/100). For example, if a product costs ₹840 after a 30% discount: Original Price = ₹840 ÷ (1 − 0.30) = ₹840 ÷ 0.70 = ₹1,200. This is "Reverse Percentage" mode in the AWE-OS calculator. It is also useful for finding the pre-GST price from a GST-inclusive price: pre-GST price = GST-inclusive price ÷ (1 + GST Rate/100). For example, an 18% GST-inclusive price of ₹1,180 has a pre-GST base of ₹1,180 ÷ 1.18 = ₹1,000.' },
    ],
  },

  'color-picker': {
    description: 'AWE-OS Color Picker is a free online tool for web developers, graphic designers, UI/UX designers, and digital artists to pick, convert, and explore colours across all major colour models: HEX (hexadecimal), RGB (Red Green Blue), HSL (Hue Saturation Lightness), and CMYK (Cyan Magenta Yellow Key/Black). The tool provides a visual colour wheel and gradient picker for intuitive colour selection, and instantly converts the selected colour to all four formats simultaneously. For web developers, the HEX and RGB values are displayed as ready-to-copy CSS code. A shade and tint generator creates a full palette of 9 tones from the selected colour — lighter tints and darker shades — which is essential for building consistent UI design systems and component libraries. A colour contrast checker shows whether the selected colour meets WCAG 2.1 AA and AAA accessibility standards when used as text on white or black backgrounds, which is critical for building accessible websites and apps.',
    features: [
      'Visual colour wheel and gradient picker for intuitive colour selection without needing to know HEX codes',
      'Instant four-way colour format conversion: HEX, RGB, HSL, and CMYK displayed simultaneously',
      'CSS code generation — RGB and HSL values formatted as ready-to-copy CSS custom properties and utility classes',
      'Shade and tint generator: 9-step palette from darkest to lightest for the selected hue — essential for design systems',
      'WCAG contrast checker showing AA and AAA accessibility compliance for text on white and black backgrounds',
      'Saved colour palette: bookmark up to 10 colours in a session for building a cohesive brand colour kit',
    ],
    useCases: [
      'Web developers writing CSS stylesheets who need to convert a HEX colour from a design mockup (Figma, Sketch) to RGB or HSL for CSS variables and animations',
      'UI/UX designers and product designers building design systems who need a full shade palette (e.g., primary-100 through primary-900) from a single brand colour',
      'Graphic designers creating print materials who need CMYK values for the same colour used digitally in HEX or RGB to ensure colour consistency across digital and print',
      'Digital marketers and brand managers identifying the exact HEX codes of competitor brand colours from screenshots for competitive analysis or brand guideline documentation',
    ],
    howToUse: [
      'Click anywhere on the colour wheel or drag the selector to choose a hue, saturation, and lightness visually',
      'Alternatively, type a known HEX code (e.g., #1E90FF) or RGB values directly into the input fields — all other formats update automatically',
      'Copy any of the four format values (HEX, RGB, HSL, CMYK) to your clipboard using the copy button next to each field',
      'Scroll down to the Shade Generator to see a 9-step palette of tints and shades based on your selected colour — click any shade to make it the active colour',
      'Check the WCAG Contrast section to verify whether your selected colour meets accessibility standards for text use',
    ],
    whyUseUs: [
      'Four-format simultaneous display eliminates the need to visit separate converters for HEX-to-RGB and RGB-to-HSL — all formats update instantly from a single colour selection or input',
      'Shade generator with 9 steps produces a complete design system colour palette in one click — essential for Tailwind CSS projects, Material Design systems, and custom UI component libraries',
      'WCAG accessibility checker built in — ensures your chosen colour combinations meet AA or AAA contrast requirements before shipping, avoiding accessibility issues discovered late in development',
    ],
    faqs: [
      { q: 'What is the difference between HEX, RGB, and HSL colour formats?', a: 'HEX (hexadecimal) is a 6-character code like #1E90FF that represents the Red, Green, and Blue components in base-16 notation. It is the most common format in web design. RGB (Red, Green, Blue) expresses the same three channels as decimal numbers from 0 to 255 — rgb(30, 144, 255). HSL (Hue, Saturation, Lightness) is more intuitive for designers: Hue is the colour angle (0°–360°), Saturation is the intensity (0% grey to 100% vivid), and Lightness is the brightness (0% black to 100% white). HSL makes it easy to create shades and tints by adjusting only the Lightness value. CMYK (Cyan, Magenta, Yellow, Key) is used for print colour specification.' },
      { q: 'What is WCAG colour contrast and why does it matter?', a: 'WCAG (Web Content Accessibility Guidelines) defines minimum contrast ratios between text and background colours to ensure readability for users with low vision or colour blindness. WCAG 2.1 Level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text. Level AAA requires 7:1 for normal text. In India, the Government of India\'s Guidelines for Indian Government Websites (GIGW) and the Rights of Persons with Disabilities Act 2016 (RPWD Act) mandate accessible web design for government websites. The AWE-OS Color Picker shows contrast ratios against both white and black backgrounds and flags AA/AAA compliance.' },
      { q: 'How do I find the HEX code of a colour I see on a website or image?', a: 'On a website: In Chrome or Firefox, right-click the element and choose "Inspect". In the Styles panel, find the color property — it is usually shown in HEX. Hover over the colour swatch to see a colour picker. On a screenshot or image: Use the browser\'s built-in eyedropper (available in Chrome and Edge DevTools), or use the AWE-OS Color Picker\'s HEX input to paste codes you find. For images on your device, tools like the Windows Snipping Tool (Windows 11) include a colour picker, and macOS Digital Colour Meter app can sample any pixel on screen. Many design tools like Figma, Adobe XD, and Canva show HEX codes in their properties panels.' },
    ],
  },

  'invoice-generator': {
    description: "AWE-OS Invoice Generator is a free online tool for Indian freelancers, consultants, and small businesses to create professional GST-compliant invoices in seconds. Designed for the Indian market, it supports GSTIN (Goods and Services Tax Identification Number) fields, CGST/SGST/IGST tax breakdown, and Indian Rupee (₹) formatting. The tool generates PDF invoices that meet the requirements of the Goods and Services Tax Network (GSTN) for B2B and B2C transactions. Freelancers on platforms like Upwork and Fiverr who receive payments in USD can convert amounts at the RBI Reference Rate and generate INR invoices for their Indian accounting records. The invoice includes all mandatory fields required under GST rules: supplier GSTIN, place of supply, HSN/SAC code for goods/services, tax rates, and invoice date. No signup required — fill the form, preview, and download PDF instantly.",
    features: [
      "GST-compliant invoice with CGST/SGST/IGST automatic split based on place of supply",
      "GSTIN field for supplier and buyer for B2B invoices requiring Input Tax Credit",
      "HSN/SAC code field for goods and services classification as required by GST Invoice Rules",
      "Automatic tax calculation at 5%, 12%, 18%, or 28% GST rate with instant total update",
      "PDF download — professional invoice ready to send to clients or file with accounts",
      "Multiple line items — add unlimited products or services per invoice with individual GST rates",
    ],
    useCases: [
      "IT freelancers and consultants raising GST invoices to Indian corporate clients for software development, consulting, and design services under the forward charge mechanism",
      "Small business owners billing B2B customers with GSTIN-to-GSTIN transactions requiring full GST invoice format for the buyer to claim Input Tax Credit",
      "Service providers raising proforma invoices and tax invoices for advance payments and final billing across multiple projects and clients",
      "Shopkeepers and traders generating quick GST bills for customers without purchasing expensive accounting software like Tally or Busy",
    ],
    howToUse: [
      "Enter your business name, address, and GSTIN in the supplier section — your GSTIN is the 15-digit alphanumeric code on your GST registration certificate",
      "Enter the client's name, address, and GSTIN (for B2B transactions) or just name and address (for B2C retail invoices)",
      "Add line items with description, HSN/SAC code, quantity, rate, and applicable GST rate for each product or service",
      "The tool automatically calculates CGST + SGST for intra-state supplies or IGST for inter-state supplies based on the place of supply you select",
      "Preview the invoice and click Download PDF to save a print-ready GST invoice suitable for sharing with clients and filing with your accountant",
    ],
    whyUseUs: [
      "GST-compliant format with automatic CGST/SGST/IGST split eliminates manual tax calculation errors that could cause GST return mismatches and attract GST department scrutiny",
      "Free with no subscription — most invoice software in India (Zoho Invoice, Vyapar, Tally) require paid plans ranging from ₹2,000 to ₹18,000 per year; AWE-OS Invoice Generator is completely free for basic invoicing needs",
      "No data stored on servers — invoice data stays in your browser, making it suitable for confidential business transactions and compliant with data privacy best practices",
    ],
    faqs: [
      { q: "Is this invoice legally valid for GST purposes in India?", a: "The AWE-OS Invoice Generator creates invoices that include all mandatory fields required under the CGST Act 2017 and GST Invoice Rules 2017: supplier name and GSTIN, invoice date and number, buyer details (GSTIN for B2B), description of goods/services, HSN/SAC code, taxable value, applicable GST rate, and CGST/SGST/IGST amounts. However, the legal validity of a GST invoice depends on the supplier being a registered taxpayer who files GST returns. The tool provides the correct format — you must ensure your GSTIN is valid and you are compliant with your GST filing obligations under GSTR-1 and GSTR-3B." },
      { q: "What is the difference between a GST invoice and a bill of supply?", a: "A GST Tax Invoice is issued by GST-registered businesses for taxable supplies — it shows the GST charged and allows the buyer to claim Input Tax Credit (ITC) on purchases used for business. A Bill of Supply is issued instead of a tax invoice when supplying exempt goods/services or when the supplier is under the Composition Scheme and cannot charge GST. Exporters also issue a Bond/LUT-backed invoice without GST for zero-rated exports under the Integrated GST framework. The AWE-OS Invoice Generator creates standard GST Tax Invoices suitable for most B2B and B2C transactions by regular GST-registered taxpayers." },
      { q: "Do I need to register for GST to raise a GST invoice?", a: "You must be a GST-registered business with a valid GSTIN to issue a GST Tax Invoice and collect GST from customers. If your annual turnover is below ₹40 lakh (₹20 lakh for service providers, ₹10 lakh for businesses in special category states like Himachal Pradesh, Uttarakhand, and northeastern states), GST registration is not mandatory and you should not charge GST. Businesses below the threshold can issue regular invoices without GST. If you are above the threshold and not registered, collecting GST without a GSTIN is illegal under Section 122 of the CGST Act and can result in penalties equal to the tax evaded or ₹10,000, whichever is higher." },
    ],
  },

  'contract-generator': {
    description: "AWE-OS Contract Generator is a free online tool for Indian freelancers, consultants, and small businesses to create professional service agreements, freelance contracts, and consulting agreements. India's freelance economy — one of the fastest growing in the world with over 15 million freelancers — faces significant challenges with late payments, scope creep, and IP disputes that arise from informal verbal agreements. A written contract provides legal protection under the Indian Contract Act 1872, which recognises any agreement between two parties with lawful consideration as a binding contract. The generator creates customisable contracts covering key clauses: scope of work, payment terms and schedule, intellectual property ownership, confidentiality (NDA), termination conditions, and dispute resolution. Generated contracts are formatted as professional documents ready for e-signature via services like Zoho Sign, DocuSign, or Leegality — India's dedicated e-signature platform valid under the IT Act 2000. Freelancers across IT, design, content, consulting, and digital marketing can create contracts in minutes that address the most common causes of payment disputes and project conflicts in the Indian gig economy.",
    features: [
      "Service agreement template covering scope of work, payment terms, IP ownership, confidentiality, and termination clauses",
      "Customisable payment milestones supporting fixed price, hourly rate, and monthly retainer payment structures",
      "IP ownership clause specifying whether deliverables are work-for-hire (client owns all rights) or licensed to client with defined usage rights",
      "Confidentiality and NDA section protecting business information, trade secrets, and client data shared during the engagement",
      "Dispute resolution clause with choice of jurisdiction — specify any Indian city for arbitration under the Arbitration and Conciliation Act 1996",
      "PDF and Word document download for editing, e-signing via Aadhaar e-Sign or DocuSign, and long-term archiving",
    ],
    useCases: [
      "IT freelancers and software developers on Upwork, Toptal, or direct client contracts who need a formal agreement before starting development work for Indian or international clients",
      "Graphic designers, content writers, and digital marketers formalising project scope and payment terms with SMB clients to prevent scope creep and late payment disputes",
      "Consultants and management advisors billing corporate clients on a retainer or project basis who need professional agreements with IP protection and confidentiality clauses",
      "Small agencies and studios formalising relationships with subcontractors and vendors through service agreements defining deliverables, timelines, and payment milestones",
    ],
    howToUse: [
      "Select the contract type: Freelance Service Agreement, Consulting Agreement, or Standalone NDA depending on your engagement",
      "Enter the service provider and client details — full legal name, address, PAN (for TDS purposes), and contact information for both parties",
      "Define the scope of work, project timeline, and deliverables clearly — specificity here is what prevents future disputes",
      "Set payment terms: total amount or hourly rate, payment schedule (milestone-based or monthly), and late payment interest clause (typically 1.5–2% per month)",
      "Download the generated contract as a PDF or Word document, review with your client, and sign using an e-signature service or print and sign physically",
    ],
    whyUseUs: [
      "India-specific legal framework — contracts reference the Indian Contract Act 1872 and specify Indian jurisdiction, unlike generic international templates that default to US or UK law and are not enforceable in Indian courts",
      "Free with no lawyer fees for basic contracts — a professionally drafted freelance contract from an Indian lawyer typically costs ₹5,000 to ₹15,000; the AWE-OS generator provides a solid starting template at zero cost",
      "Covers the four most common freelancer disputes in India — late payment, scope creep, IP ownership, and unilateral termination — with specific clauses designed around these recurring pain points",
    ],
    faqs: [
      { q: "Is a digitally generated contract legally valid in India?", a: "Yes. Under the Indian Contract Act 1872, a contract is valid if there is an offer, acceptance, lawful consideration, and free consent — there is no mandatory requirement for a specific format or physical signature for most service contracts. The Information Technology Act 2000 recognises electronic signatures and e-contracts as legally valid in India. E-signatures via Aadhaar e-Sign, DocuSign, Zoho Sign, or Leegality are legally binding. However, certain documents — property sale deeds, wills, and negotiable instruments — must be on stamp paper and physically signed. For freelance service contracts, which are not covered by these exclusions, a digitally generated and e-signed contract is fully valid and enforceable in Indian civil courts." },
      { q: "Do I need to pay stamp duty on a freelance contract in India?", a: "Stamp duty requirements for service agreements vary by state. In most Indian states, service agreements are chargeable under the relevant State Stamp Act — typically a nominal fixed duty of ₹100 to ₹500 or a small percentage of the contract value. For high-value contracts above ₹1 lakh, it is advisable to execute the contract on stamp paper of the appropriate denomination or pay e-stamp duty via the state government portal. The AWE-OS Contract Generator creates the contract text — stamp paper execution and payment of applicable duty is your responsibility based on your state's rules and the value of the engagement." },
      { q: "What should I include in the scope of work to avoid disputes?", a: "The scope of work clause is the most important part of any freelance contract and the most frequent source of disputes. It should include: a precise list of deliverables (not vague terms like 'a website' but specific outputs like '5 responsive React pages with mobile breakpoints'); what is explicitly excluded from the current engagement; the number of revision rounds included in the quoted price; the format of deliverables (file types, resolution, platform); acceptance criteria that define when a deliverable is considered complete; and a timeline with milestone dates. The AWE-OS Contract Generator includes a structured scope-of-work template with prompts for each of these elements to help both parties reach clear agreement before work begins." },
    ],
  },

  'resume-builder': {
    description: "AWE-OS Resume Builder is a free online tool for Indian job seekers, fresh graduates, and working professionals to create ATS-friendly (Applicant Tracking System) resumes that pass the automated screening filters used by Indian IT companies, MNCs, and recruitment platforms like Naukri, LinkedIn, and Shine. India's competitive job market — with lakhs of applications per opening at top companies like TCS, Infosys, Wipro, and leading Indian unicorn startups — means resumes are first screened by ATS software before reaching any human recruiter. Resumes with improper formatting, missing keywords, or non-standard section headers are rejected automatically, even if the candidate is well-qualified. The AWE-OS Resume Builder generates clean, ATS-parseable resumes in PDF and Word formats using standard structures that pass the ATS filters used by major Indian hiring portals. The tool supports all major resume sections: objective/summary, education (with CGPA, university name, and passing year), work experience, internships, technical skills, projects, certifications including NPTEL, Coursera, AWS, and Microsoft credentials widely recognised in the Indian market, and languages. Fresher templates are specifically optimised for engineering graduates from IITs, NITs, BITS, and tier-2 engineering colleges applying to campus placement drives and off-campus recruitment rounds. Mid-level and senior templates are designed for experienced professionals targeting lateral hires at MNCs and high-growth Indian startups.",
    features: [
      "ATS-friendly resume format that passes automated screening systems used by Naukri, LinkedIn, and major Indian IT and product companies",
      "Multiple templates: Fresher for campus placements, Mid-level for 3–8 years experience, and Senior/Managerial — each optimised for the respective career stage",
      "Skill keyword suggestions based on job role — Java developer, data analyst, digital marketer, CA, MBA graduate, and 30+ other role profiles",
      "Education section with CGPA, board/university name, and passing year formatted to Indian academic conventions and recruiter expectations",
      "Project and internship sections — critical for freshers and early-career professionals who need to showcase work beyond academics",
      "PDF and DOCX download optimised for uploading to Naukri, LinkedIn, and company career portals without formatting corruption",
    ],
    useCases: [
      "Engineering freshers from IITs, NITs, BITS, and tier-2 colleges preparing resumes for campus placement drives at product companies and IT services firms who need ATS-optimised formats highlighting projects, internships, and CGPA",
      "Working professionals in IT, finance, marketing, and operations with 2–10 years of experience updating their resume for job switches targeting higher CTC roles at Indian MNCs or global companies with India offices",
      "MBA graduates from IIMs, XLRI, and other B-schools creating functional resumes that highlight internships, case competition achievements, and leadership roles for placements in consulting, FMCG, and banking",
      "Government job aspirants preparing detailed bio-data for PSU recruitment, UPSC civil services, and state government positions that require specific format conventions and complete educational history",
    ],
    howToUse: [
      "Select a template based on your career stage: Fresher, Experienced (3–8 years), or Senior/Manager",
      "Fill in personal details, objective or summary, and education — for Indian resumes include CGPA or percentage, board or university name, and the city of the institution",
      "Add work experience with company name, designation, employment dates, and 3–5 bullet points per role describing measurable impact and key achievements",
      "Add technical skills, projects, certifications, and extracurricular activities — for freshers, projects and internships carry as much weight as academics",
      "Preview the resume and download as PDF for online job portals or as DOCX for further customisation in Microsoft Word or Google Docs",
    ],
    whyUseUs: [
      "ATS-optimised specifically for Indian job portals and hiring systems — avoids common ATS failures like tables, multi-column layouts, headers/footers, and decorative fonts that cause Naukri and LinkedIn profile-import parsing errors",
      "Free with no watermark or paywall — paid resume builders charge ₹500 to ₹2,000 for PDF downloads; AWE-OS Resume Builder provides professionally formatted resumes at no cost with no hidden subscription",
      "India-specific templates with correct conventions for CGPA presentation, Indian date formats, and section ordering preferred by Indian HR departments and campus recruitment committees at top companies",
    ],
    faqs: [
      { q: "What is an ATS and why does my resume need to be ATS-friendly for Indian job applications?", a: "An ATS (Applicant Tracking System) is software used by HR departments and recruitment agencies to automatically screen, rank, and filter resumes before they reach a human recruiter. In India, Naukri and LinkedIn use ATS-style parsing to extract skills, experience, and education from uploaded resumes. Large Indian IT companies and MNCs receive thousands of applications per role and rely entirely on ATS to shortlist candidates. A resume that uses tables, multi-column layouts, graphics, or non-standard fonts can fail ATS parsing — the system cannot read your qualifications and may reject the application even if you are well-qualified. ATS-friendly resumes use simple single-column layouts, standard section headers such as Experience, Education, and Skills, and plain text formatting without decorative elements." },
      { q: "Should I include a photo on my Indian resume?", a: "In India, including a professional passport-size photograph is common and expected in sectors like banking, hospitality, government, and BPO/KPO. For IT product companies, startups, and international companies with India offices such as Google, Microsoft, and Amazon, omitting the photo is increasingly common and sometimes preferred to reduce unconscious bias in screening. Government and PSU applications often require a photo on the application form rather than embedded in the resume. The AWE-OS Resume Builder gives you the option to include or exclude a photo placeholder based on the type of role and sector you are targeting." },
      { q: "How long should an Indian resume be — one page or two pages?", a: "For freshers and candidates with less than 3 years of experience, a one-page resume is standard in India, especially for IT and engineering roles — it signals conciseness and strong prioritisation. For mid-level professionals with 4 to 10 years of experience, two pages are acceptable and often expected to detail multiple roles, key projects, and measurable achievements. For senior professionals with 10 or more years, two to three pages are common in consulting, finance, and general management. MBA resumes for top B-school placements are often strictly one page. Government bio-data formats can run 5 or more pages and follow entirely different conventions. The AWE-OS Resume Builder automatically adjusts the template layout based on the volume of content you enter." },
    ],
  },

  'ai-content-writer': {
    description: "AWE-OS AI Content Writer is a free online tool for Indian entrepreneurs, bloggers, digital marketers, and small business owners to generate high-quality blog posts, product descriptions, social media captions, email newsletters, and website copy in seconds. India's digital economy serves over 900 million internet users, with millions of small and medium businesses needing regular content for their websites, Instagram pages, WhatsApp Business accounts, and e-commerce listings — but without the budget for professional content writers who charge ₹3 to ₹8 per word. The AI Content Writer is built with the Indian business context in mind: it generates content that references local festivals such as Diwali, Eid, and Holi promotions, Indian payment preferences like UPI, EMI, and COD, GST-inclusive pricing, and regional audience considerations. Content can be generated in English and Hinglish — the Hindi-English mix widely used on Indian social media — to reach urban Indian audiences effectively across platforms. The tool supports multiple content types and tones: Professional for B2B, legal, and financial content; Conversational for social media, emails, and WhatsApp broadcasts; and Persuasive for sales landing pages and marketplace product listings. All generated content is a high-quality first draft that you refine with your own voice, specific local data, and unique business details before publishing.",
    features: [
      "Blog post and article generator — produce 500 to 1,500 word articles on any topic with structured headings, subheadings, and paragraphs",
      "Product description writer for Amazon India, Flipkart, Meesho, and independent e-commerce websites with marketplace SEO optimisation",
      "Social media caption generator for Instagram, Facebook, and LinkedIn with hashtag suggestions relevant to Indian audiences",
      "Email newsletter and promotional email templates for Indian festivals, seasonal sales events, and product launch announcements",
      "Tone selector: Professional, Conversational, and Persuasive — match content style to your brand voice and target audience",
      "English and Hinglish output — generate content that resonates with pan-India urban audiences across digital channels",
    ],
    useCases: [
      "E-commerce sellers on Amazon India, Flipkart, and Meesho who need compelling product titles, bullet-point features, and detailed descriptions that rank in marketplace search results and convert browsers into buyers",
      "Small business owners with Instagram and Facebook pages who need daily social media posts, festival greetings, promotional offers, and product showcase content without hiring a dedicated social media manager",
      "Bloggers and content creators in personal finance, health, travel, and technology niches who need research-backed article outlines and first drafts to accelerate their publishing schedule and grow organic traffic",
      "Digital marketing agencies managing content calendars for multiple SMB clients who need first-draft content quickly across real estate, restaurants, salons, retail, and local business categories",
    ],
    howToUse: [
      "Select the content type: Blog Post, Product Description, Social Media Caption, Email Newsletter, or Website Copy",
      "Enter a brief description of your topic, product, or business — for example, 'Ayurvedic hair oil for women, anti-hairfall, available on Amazon India' or 'Diwali discount sale for electronics shop in Pune'",
      "Choose your preferred tone (Professional, Conversational, or Persuasive) and output language (English or Hinglish)",
      "Click Generate and review the AI-produced content — output appears in seconds and is ready to edit and personalise with your own details",
      "Copy the generated text and paste into your website CMS, social media platform, or email marketing tool for final editing and publishing",
    ],
    whyUseUs: [
      "India-context awareness — AWE-OS AI Content Writer generates content that understands Indian business contexts, local festivals, regional buying behaviours, and Indian English usage patterns, unlike generic global AI writing tools that produce content unsuitable for Indian audiences",
      "Free with no credit card required — commercial AI writing tools like Jasper, Copy.ai, and Writesonic charge ₹2,000 to ₹10,000 per month; AWE-OS provides essential content generation at no cost for individual creators and small businesses with limited marketing budgets",
      "Multi-format output from a single prompt — generate a blog post, social caption, and email from the same product description input, eliminating hours of reformatting the same core content for different channels and audiences",
    ],
    faqs: [
      { q: "Is AI-generated content safe to use for my website — will Google penalise it?", a: "Google's official position is that AI-generated content is not inherently against its policies. Google's algorithms reward helpful, high-quality content regardless of how it was produced. What Google penalises is low-quality, spammy, or misleading content — whether written by humans or AI. To use AI content safely for SEO: always review and edit AI output before publishing; add unique insights, local data, and personal examples the AI cannot know; and ensure the content genuinely helps your reader. Thin, unedited AI content published at scale will attract Google's spam classifier. Human-reviewed and edited AI content ranks as well as traditionally written content. Use the AWE-OS AI Content Writer as a first-draft accelerator, not a publish-without-review shortcut." },
      { q: "Can I use AWE-OS AI Content Writer to create content in regional Indian languages like Hindi, Tamil, or Bengali?", a: "The current version of AWE-OS AI Content Writer generates content in English and Hinglish — English with natural Hindi word and phrase inclusions common on Indian social media. Support for fully regional language output including Hindi in Devanagari script, Tamil, Telugu, Kannada, Marathi, Bengali, and Gujarati is on the product roadmap. For immediate needs, generating content in English and then translating via Google Translate or DeepL provides a reasonable starting point for regional language social media content, though machine translation should always be reviewed by a native speaker before publishing on customer-facing platforms." },
      { q: "How do I make AI-generated product descriptions rank better on Amazon India and Flipkart?", a: "Marketplace SEO for Amazon India and Flipkart requires specific optimisation steps: include exact keywords buyers search for in the product title and first 200 characters of the description, using Amazon's search bar autocomplete to find high-volume Indian search terms; add specific product attributes such as weight, dimensions, material, and compatibility; mention Indian buyer concerns including COD availability, easy returns, GST invoice included, and ISI or BIS certification where applicable; use complete bullet-point sections for key features since marketplace algorithms favour fully completed listings; and include festival use cases for Diwali gifting and wedding season to capture seasonal search traffic. Select Product Description mode in AWE-OS and specify the target marketplace for optimised output." },
    ],
  },

  'csv-to-json': {
    description: "AWE-OS CSV to JSON Converter is a free online tool for developers, data analysts, and database administrators to instantly convert CSV (Comma-Separated Values) files and text into valid JSON (JavaScript Object Notation) format. CSV and JSON are the two most widely used data interchange formats in web development, data engineering, and API integration — but most APIs, JavaScript frameworks, and NoSQL databases prefer JSON, while most spreadsheets, ERP systems, and government data portals export in CSV. The converter handles all common CSV variations: custom delimiters including comma, semicolon, pipe, and tab; quoted fields containing commas or newlines; and automatic header row detection that maps column names to JSON object keys. Output JSON is properly indented for readability and can also be minified to a single line for API payloads and configuration files. Indian developers working with government open data portals such as data.gov.in, SEBI and NSE market data exports, GSTN data downloads, MCA21 filings, and state government dataset releases frequently encounter CSV files that need conversion to JSON for use in web applications, React and Angular frontends, and Node.js or Python backends. The tool processes all data entirely in the browser — no file is transmitted to any external server — ensuring sensitive financial, HR, or customer data never leaves your device.",
    features: [
      "Instant CSV to JSON conversion — paste CSV text or upload a .csv file and get formatted JSON output in under one second",
      "Custom delimiter support — handles comma, semicolon, pipe (|), tab, and any custom character as the field separator",
      "Automatic header row detection — first row becomes JSON object keys; toggle off to treat all rows as plain data arrays if there is no header",
      "Pretty-print and minify modes — indented JSON for development and debugging, or compact single-line JSON for API payloads",
      "Type inference — numeric strings become numbers, true/false strings become booleans, and empty cells become null in the JSON output",
      "Download output as a .json file or copy to clipboard for use in code editors, Postman, MongoDB import, or API testing tools",
    ],
    useCases: [
      "Frontend developers loading static data — Indian city lists, pin code databases, state and district lookup tables, product catalogs — from CSV exports into React, Vue, or Angular applications as JSON data files",
      "Data analysts and BI professionals converting Excel and CSV exports from SAP, Tally, Zoho, or ERP systems into JSON for ingestion into MongoDB, Elasticsearch, or cloud data warehouses like BigQuery or Snowflake",
      "Backend developers building REST APIs who need to seed a database with CSV data — convert to a JSON array and import via Mongoose, Sequelize, or a direct database seed script in Node.js or Python",
      "Government and research data users working with open datasets from data.gov.in, the RBI DBIE database, SEBI disclosures, or MOSPI statistical releases published in CSV format for use in web applications and dashboards",
    ],
    howToUse: [
      "Paste your CSV text directly into the input area or click Upload CSV to select a .csv file from your device",
      "Set the delimiter if your file uses semicolons, tabs, or pipes instead of commas — the tool auto-detects the most common delimiters",
      "Toggle 'First row is header' on or off depending on whether your CSV has column names in the first row",
      "The JSON output appears instantly in the right panel — switch between Pretty Print (indented) and Minify (compact) as needed for your use case",
      "Click Copy JSON to copy the output to your clipboard, or Download JSON to save the output as a .json file",
    ],
    whyUseUs: [
      "Browser-only processing — your CSV data never leaves your device, making this tool safe for sensitive data including employee records, customer lists, financial transactions, and health records that cannot be uploaded to external servers under data privacy policies",
      "Handles messy real-world CSV — supports quoted fields with embedded commas, multi-line cell values, and inconsistent spacing that break simpler online converters, matching the reality of CSV exports from Indian ERP systems and government data portals",
      "Type inference converts data correctly — numbers stay as numbers rather than strings, booleans are recognised, and null values are properly represented, avoiding the need for manual post-processing in your application code",
    ],
    faqs: [
      { q: "What is the difference between CSV and JSON, and when should I use each?", a: "CSV (Comma-Separated Values) is a plain text format where each line is a data row and values are separated by commas or another delimiter. It is ideal for tabular data — spreadsheets, database exports, and data imports — and is supported by Excel, Google Sheets, and virtually every database and BI tool. JSON (JavaScript Object Notation) is a hierarchical text format representing data as objects (key-value pairs) and arrays. It is the standard format for web APIs, REST services, NoSQL databases such as MongoDB and Firebase, and JavaScript applications. Use CSV for spreadsheets, reports, and database bulk imports. Use JSON for APIs, web apps, and any system consuming structured data programmatically. The AWE-OS CSV to JSON converter bridges the two formats instantly and at no cost." },
      { q: "How do I convert a CSV that contains Indian language text or the Rupee symbol?", a: "The AWE-OS CSV to JSON converter handles UTF-8 encoded CSV files, which support all Unicode characters including Devanagari (Hindi), Tamil, Telugu, Kannada, Bengali, Gujarati scripts, and the Indian Rupee symbol (₹). If Indian language text appears garbled after conversion, the issue is usually the file encoding — files exported from older versions of Microsoft Excel on Windows are often encoded in Windows-1252 (ANSI) rather than UTF-8. To fix this: open the CSV in Notepad, go to File > Save As, change the Encoding dropdown to UTF-8, and save. Then re-upload the UTF-8 version to the converter. Files exported directly from Google Sheets are always in UTF-8 and will convert correctly without this additional step." },
      { q: "Can I convert JSON back to CSV using this tool?", a: "The AWE-OS CSV to JSON converter is a one-way converter from CSV to JSON. For the reverse operation, use the AWE-OS JSON to CSV converter, which handles flat JSON arrays where each object becomes a CSV row, with options for selecting which fields to include as columns. For nested JSON with objects inside objects, you will need to flatten the structure first — the AWE-OS JSON Formatter tool can help you inspect and understand the nested structure before conversion. Both tools are available on the AWE-OS platform at no cost and process data entirely in the browser." },
    ],
  },

  'base-converter': {
    description: "AWE-OS Base Converter is a free online tool for computer science students, competitive programmers, software developers, and electronics engineers to convert numbers between the four primary numeral systems used in computing: Binary (Base 2), Octal (Base 8), Decimal (Base 10), and Hexadecimal (Base 16). Number base conversion is a fundamental skill in computer science education — it is covered in the Class 11 and 12 CBSE Computer Science curriculum under the NCERT syllabus, the BCA and B.Tech CSE syllabi at Indian universities, and appears as a standard question type in competitive examinations including GATE (Graduate Aptitude Test in Engineering), TCS NQT, Infosys InfyTQ, Wipro NLTH, Accenture online tests, and UPSC CDS technical papers. The tool converts any positive integer or fractional number from one base to another in real-time, displaying all four base representations simultaneously. It also shows the step-by-step conversion process — the division-remainder method for integer parts and the repeated-multiplication method for fractional parts — alongside the result. This makes the tool valuable not just for getting answers quickly but for learning and verifying the calculation method, which is essential for students preparing for theory-based examinations where showing the working is required alongside the final answer. The tool supports custom base conversion from Base 2 to Base 36, covering specialist use cases in cryptography, colour science, and advanced computer architecture studies.",
    features: [
      "Four-base simultaneous display — enter a number in any base and instantly see the Binary, Octal, Decimal, and Hexadecimal equivalents",
      "Step-by-step conversion working — division-remainder method for integer parts and multiplication method for fractional parts, shown clearly",
      "Fractional number support — convert numbers with decimal points such as 10.75 decimal to 1010.11 binary, with full working shown",
      "Hexadecimal letter case options — output hex in uppercase A–F or lowercase a–f to match your codebase or specification requirements",
      "Custom base conversion — convert between any base from 2 to 36 for advanced use cases beyond the standard four numeral systems",
      "Binary nibble grouping — large binary numbers displayed in groups of 4 bits for easier reading and manual verification",
    ],
    useCases: [
      "Class 11 and 12 CBSE and ICSE computer science students learning number systems for board examinations and practising textbook exercises on binary, octal, decimal, and hexadecimal conversion",
      "B.Tech CSE and BCA students at Indian universities preparing for GATE, university semester exams, and placement aptitude tests where number base conversion questions appear consistently",
      "Software developers working with low-level programming, bitwise operations, memory addresses, IP address subnetting, or HTML/CSS colour codes in hex who need quick base conversions without manual calculation",
      "Electronics and embedded systems engineers reading microcontroller datasheets, programming hardware registers in hexadecimal, and interpreting binary sensor outputs from Arduino, Raspberry Pi, and STM32 development boards",
    ],
    howToUse: [
      "Select the input base: Binary, Octal, Decimal, or Hexadecimal — or enter a custom base from 2 to 36 for non-standard conversion",
      "Type the number to convert in the input field — the tool validates your input and highlights invalid characters such as the digit 9 entered in a binary input field",
      "All four output values (Binary, Octal, Decimal, Hexadecimal) update instantly as you type with no submit button required",
      "Click Show Steps to expand the step-by-step working for the conversion — useful for studying the method or verifying a manual calculation",
      "Copy any individual output value using the copy button next to each field for use in code, documentation, or exam answer sheets",
    ],
    whyUseUs: [
      "Step-by-step working display makes this a study tool, not just a calculator — students see the exact division-remainder or multiplication steps, helping them practise the technique for written exams where showing working is required alongside the final answer",
      "All four bases displayed simultaneously from a single input — no need to run separate conversions for binary-to-decimal and then decimal-to-hex; all representations appear at once, saving time during exam practice and competitive programming",
      "Fractional number support is rare in free base converters — AWE-OS handles numbers like 10.625 and shows the binary fractional conversion step by step, covering a question type frequently tested in GATE and Indian university examination papers",
    ],
    faqs: [
      { q: "How do I convert a decimal number to binary?", a: "To convert a decimal integer to binary, use the repeated division-by-2 method: divide the decimal number by 2 and note the remainder (0 or 1); divide the quotient by 2 and note the remainder; repeat until the quotient is 0; then read the remainders from bottom to top — that sequence is the binary number. Example: Convert 45 to binary. 45 ÷ 2 = 22 remainder 1. 22 ÷ 2 = 11 remainder 0. 11 ÷ 2 = 5 remainder 1. 5 ÷ 2 = 2 remainder 1. 2 ÷ 2 = 1 remainder 0. 1 ÷ 2 = 0 remainder 1. Reading remainders bottom to top: 101101. So decimal 45 equals binary 101101. The AWE-OS Base Converter shows each of these division steps when you click Show Steps, making it easy to check your manual working." },
      { q: "What is hexadecimal and why do programmers use it instead of binary?", a: "Hexadecimal (Base 16) uses 16 digits: 0 through 9 and A through F, where A=10, B=11, C=12, D=13, E=14, and F=15. Programmers use hexadecimal because one hex digit represents exactly 4 binary bits (called a nibble), making hex a compact and readable representation of binary data. An 8-bit byte is always exactly 2 hex digits — for example, 11111111 in binary equals FF in hex. This makes memory addresses, colour codes, and machine instructions far more readable in hex than in raw binary. In web development, HTML and CSS colours are expressed in hexadecimal such as #FF5733. In systems programming and embedded development, memory addresses and CPU registers are always displayed in hex. Hexadecimal is the practical bridge between binary machine data and human readability." },
      { q: "How do I convert hexadecimal to decimal without a calculator?", a: "To convert a hex number to decimal, multiply each digit by 16 raised to its positional power starting from 0 on the right, then sum all the results. Example: Convert 2FA in hex to decimal. Rightmost position (power 0): A = 10, multiplied by 16 to the power 0 which equals 1, gives 10. Middle position (power 1): F = 15, multiplied by 16 to the power 1 which equals 16, gives 240. Left position (power 2): 2, multiplied by 16 to the power 2 which equals 256, gives 512. Sum: 512 + 240 + 10 = 762. So hexadecimal 2FA equals decimal 762. This positional method works for any base — the same approach applies for binary using powers of 2 and for octal using powers of 8. The AWE-OS Base Converter's Show Steps mode displays this full calculation for any hex-to-decimal conversion." },
    ],
  },

  'json-formatter': {
    description: "AWE-OS JSON Formatter is a free online tool for web developers, backend engineers, and API developers to beautify (pretty-print), validate, minify, and navigate JSON (JavaScript Object Notation) data. JSON is the universal data format of modern web development — every REST API, NoSQL database, configuration file, and JavaScript or TypeScript application uses JSON extensively. Working with raw API responses and database query results is difficult because JSON is often returned as a single compact line with no indentation or whitespace, making it nearly impossible to read or debug manually. The AWE-OS JSON Formatter instantly transforms compact, unreadable JSON into properly indented, colour-highlighted, human-readable format with distinct colours for keys, strings, numbers, and booleans. It simultaneously validates the JSON and reports precise error locations — line number and character position — for all common syntax errors: missing commas, unmatched brackets, improper quote usage, and trailing commas. These are the most frequent causes of JSON parsing failures during API development and debugging sessions. Indian developers working with APIs from government platforms such as DigiLocker, Aadhaar e-KYC, UPI payment gateways, the GSTN API, and IndiaStack services; fintech companies; logistics aggregators like Delhivery and Shiprocket; and payment processors like Razorpay, PayU, and Paytm frequently encounter JSON responses that require validation and formatting for effective debugging. The tool also minifies JSON — compressing formatted data to the smallest possible form for API request payloads and production configuration files. All processing is browser-only; no JSON data is ever transmitted to any external server.",
    features: [
      "JSON beautifier — formats minified or unindented JSON with proper 2-space, 4-space, or tab indentation for immediate readability",
      "Real-time validator — detects and highlights syntax errors with precise line number and character position in the error message",
      "JSON minifier — compresses formatted JSON to the smallest single-line form for API payloads, localStorage values, and production configs",
      "Interactive tree view — collapsible and expandable JSON tree for navigating large nested objects and arrays without scrolling through raw text",
      "JSON path display — click any value in tree view to see its full JSON path such as response.data.items[3].price for direct use in code",
      "Copy and download — export formatted or minified JSON to clipboard or as a .json file with a single click",
    ],
    useCases: [
      "Frontend and backend developers debugging REST API responses from payment gateways (Razorpay, PayU, Paytm), logistics APIs (Delhivery, Shiprocket), and government APIs (GSTN, Aadhaar, DigiLocker) who need readable, validated JSON to troubleshoot integration failures quickly",
      "DevOps and cloud engineers working with JSON-format IAM policies on AWS, GCP, and Azure; Kubernetes manifests converted to JSON; and Terraform state files who need validation and formatting before applying any infrastructure changes",
      "Data engineers and analysts parsing JSON API responses from Indian fintech, edtech, and e-commerce platforms into structured formats for loading into SQL databases, data lakes, or business intelligence dashboards",
      "Mobile app developers on Android, iOS, and React Native who inspect JSON from backend APIs via Postman or cURL and need quick formatting and validation without switching between multiple developer tools",
    ],
    howToUse: [
      "Paste your JSON text into the input area — this can be a single-line minified JSON string, a partial API response copied from Postman or browser DevTools, or the contents of a .json configuration file",
      "The formatter validates your JSON in real time — a green border indicates valid JSON, while a red border with an error message shows the exact location of any syntax error",
      "Click Beautify to format with indentation for easy reading, or Minify to compress to a single compact line for production use",
      "Switch to Tree View to navigate the JSON structure interactively — click the arrow next to any object or array to expand or collapse that section",
      "Click any key or value in tree view to copy its full JSON path, or use the Copy and Download buttons to export the formatted or minified output",
    ],
    whyUseUs: [
      "Precise error reporting with line and character position — unlike basic validators that only say invalid JSON, AWE-OS JSON Formatter tells you exactly where the error is, such as 'Unexpected token at line 47, column 12 — missing comma after string value', dramatically reducing time spent debugging malformed API responses",
      "Tree view with JSON path display is essential for navigating complex nested API responses — collapse irrelevant sections and click any value to copy its exact key path for immediate use in JavaScript, Python, or backend application code",
      "Browser-only processing keeps sensitive data secure — API responses containing authentication tokens, customer PII, payment records, and internal system data are never transmitted to external servers, satisfying data handling requirements in professional development environments",
    ],
    faqs: [
      { q: "What are the most common JSON syntax errors and how do I fix them?", a: "The five most common JSON syntax errors are: trailing comma — a comma after the last item in an array or object is invalid in JSON, unlike in JavaScript, so remove the comma after the final element; single quotes instead of double quotes — JSON requires double quotes for all strings and keys, so replace all single quotes with double quotes; unquoted keys — JSON requires object keys to be quoted strings, so add double quotes around all keys; comments — JSON does not support single-line or block comments, so remove all comments before parsing; and undefined or NaN values — these JavaScript-specific values are not valid in JSON, so replace them with null, a valid number, or a string representation. The AWE-OS JSON Formatter identifies which error is present and highlights the exact location in your input, making it straightforward to apply the correct fix." },
      { q: "What is the difference between JSON and a JavaScript object literal?", a: "JSON (JavaScript Object Notation) was derived from JavaScript object syntax but is a stricter, language-independent data format with important differences. JSON requires double quotes around all strings and object keys — JavaScript object literals allow single quotes and unquoted keys. JSON does not support functions, undefined, NaN, Infinity, or Date objects, which are JavaScript-specific values. JSON supports only six data types: string, number, boolean, null, array, and object. JSON is a serialised string used for data transport between systems — a JavaScript object is a live in-memory data structure. You convert between them using JSON.parse() to turn a JSON string into a JavaScript object, and JSON.stringify() to turn an object into a JSON string. The AWE-OS JSON Formatter works with valid JSON strings, not JavaScript object literals." },
      { q: "How do I format a very large JSON file efficiently?", a: "For JSON files under 5 MB, the AWE-OS JSON Formatter processes data in the browser without performance issues on modern computers and browsers. For very large files from 5 MB to hundreds of megabytes, command-line tools are significantly more efficient. jq is a powerful command-line JSON processor available on Linux, macOS, and Windows via package managers — the command 'jq . large_file.json' formats and pretty-prints any JSON file instantly. Python's built-in json module also works without installing anything extra: 'python -m json.tool large_file.json' outputs formatted JSON to the terminal. For Indian developers working with large datasets from data.gov.in, bulk financial transaction exports from payment processors, or API response archives from logistics and e-commerce platforms, these command-line approaches are recommended for files above 5 MB where browser-based tools may become slow." },
    ],
  },
}
