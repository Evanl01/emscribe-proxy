// Content script for EMScribe with enhanced debugging
console.log('EMScribe content script loaded');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('EMScribe: Received message:', request);
  
  if (request.action === 'autofill') {
    console.log('EMScribe: Starting autofill process');
    handleAutofill(request.patientData, request.ehr, request.noteType)
      .then(result => {
        console.log('EMScribe: Autofill result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('EMScribe: Autofill error:', error);
        sendResponse({success: false, error: error.message});
      });
    return true; // Keep the message channel open for async response
  }
});

async function handleAutofill(patientData, ehr, noteType) {
  console.log('EMScribe: handleAutofill called with:', {
    patientData: patientData,
    ehr: ehr,
    noteType: noteType
  });
  
  // Check if we're on the correct page
  const isValidPage = isValidPatientEncounterPage();
  console.log('EMScribe: Page validation result:', isValidPage);
  
  if (!isValidPage) {
    const currentUrl = window.location.href;
    console.log('EMScribe: Invalid page. Current URL:', currentUrl);
    return {
      success: false,
      error: 'EMScribe only works on the Patient Encounter page. Click on your patient, and then click new Encounter to get started.'
    };
  }
  
  if (ehr === 'practice-fusion' && noteType === 'soap-note') {
    console.log('EMScribe: Starting Practice Fusion SOAP note autofill');
    return await autofillPracticeFusion(patientData);
  }
  
  console.log('EMScribe: Unsupported EHR or note type');
  return {success: false, error: 'Unsupported EHR or note type'};
}

function isValidPatientEncounterPage() {
  const url = window.location.href;
  console.log('EMScribe: Checking URL validity:', url);
  
  // Updated pattern to match your actual URL format
  const patterns = [
    /^https:\/\/static\.practicefusion\.com\/apps\/ehr\/.*\/patients\/.*\/encounter\/.*/,
    /^https:\/\/static\.practicefusion\.com\/apps\/ehr\/index\.html#\/PF\/charts\/patients\/.*\/encounter\/.*/
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const matches = patterns[i].test(url);
    console.log(`EMScribe: Pattern ${i + 1} (${patterns[i]}) matches:`, matches);
    if (matches) {
      return true;
    }
  }
  
  return false;
}

async function autofillPracticeFusion(patientData) {
  console.log('EMScribe: Starting Practice Fusion autofill with data:', patientData);
  
  try {
    // First, run a quick element check
    await waitForPageLoad();
    
    // Step 1: Fill in Chief Complaint
    console.log('EMScribe: Attempting to fill Chief Complaint');
    await fillChiefComplaint(patientData.chiefComplaint);
    
    // Step 2: Fill in SOAP note sections
    console.log('EMScribe: Attempting to fill SOAP sections');
    await fillSOAPSections(patientData);
    
    console.log('EMScribe: All autofill steps completed successfully');
    return {success: true, message: 'Successfully autofilled all data'};
  } catch (error) {
    console.error('EMScribe: Autofill error:', error);
    console.error('EMScribe: Error stack:', error.stack);
    return {success: false, error: error.message};
  }
}

async function waitForPageLoad() {
  console.log('EMScribe: Waiting for page to be fully loaded...');
  
  // Wait for DOM to be ready
  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      const checkReady = () => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }
  
  // Additional wait for dynamic content (SPA)
  await sleep(1000);
  console.log('EMScribe: Page load wait completed');
}

async function fillChiefComplaint(chiefComplaint) {
  console.log('EMScribe: Filling Chief Complaint with:', chiefComplaint);
  
  // Try multiple possible selectors for the chief complaint field
  const selectors = [
    '[data-element="input-chief-complaint"]',
    '[data-testid="chief-complaint"]',
    'input[placeholder*="chief complaint" i]',
    'input[placeholder*="Chief Complaint" i]',
    'textarea[placeholder*="chief complaint" i]',
    'input[name*="chief" i]',
    'textarea[name*="chief" i]'
  ];
  
  let chiefComplaintInput = null;
  
  for (const selector of selectors) {
    console.log(`EMScribe: Trying selector: ${selector}`);
    const elements = document.querySelectorAll(selector);
    console.log(`EMScribe: Found ${elements.length} elements with selector: ${selector}`);
    
    if (elements.length > 0) {
      chiefComplaintInput = elements[0];
      console.log('EMScribe: Found chief complaint element:', chiefComplaintInput);
      break;
    }
  }
  
  if (!chiefComplaintInput) {
    console.log('EMScribe: Chief Complaint input not found. Scanning all inputs...');
    
    // Scan all inputs and textareas
    const allInputs = document.querySelectorAll('input, textarea');
    console.log(`EMScribe: Found ${allInputs.length} total input elements`);
    
    allInputs.forEach((input, index) => {
      console.log(`EMScribe: Input ${index}:`, {
        tagName: input.tagName,
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className,
        dataElement: input.getAttribute('data-element')
      });
    });
    
    throw new Error('Chief Complaint input not found. Check console for available inputs.');
  }
  
  // Clear existing content and fill with new data
  console.log('EMScribe: Clearing and filling chief complaint field');
  chiefComplaintInput.value = '';
  chiefComplaintInput.focus();
  
  // Simulate typing for better compatibility
  await simulateTyping(chiefComplaintInput, chiefComplaint);
  
  // Trigger change event
  chiefComplaintInput.dispatchEvent(new Event('change', {bubbles: true}));
  chiefComplaintInput.dispatchEvent(new Event('input', {bubbles: true}));
  chiefComplaintInput.dispatchEvent(new Event('blur', {bubbles: true}));
  
  console.log('EMScribe: Chief Complaint filled successfully');
}

async function fillSOAPSections(patientData) {
  console.log('EMScribe: Starting SOAP sections fill');
  
  const sections = [
    {name: 'Subjective', data: patientData.subjective, element: 'subjective-section'},
    {name: 'Objective', data: patientData.objective, element: 'objective-section'},
    {name: 'Assessment', data: patientData.assessment, element: 'assessment-section'},
    {name: 'Plan', data: patientData.plan, element: 'plan-section'}
  ];
  
  console.log('EMScribe: SOAP sections to fill:', sections.map(s => s.name));
  
  for (const section of sections) {
    console.log(`EMScribe: Processing ${section.name} section...`);
    try {
      await fillSOAPSection(section.element, section.data, section.name);
      console.log(`EMScribe: Successfully filled ${section.name} section`);
    } catch (error) {
      console.error(`EMScribe: Error filling ${section.name} section:`, error);
      // Continue with other sections even if one fails
    }
    await sleep(500); // Small delay between sections
  }
  
  console.log('EMScribe: SOAP sections fill process completed');
}

async function fillSOAPSection(sectionElement, data, sectionName) {
  console.log(`EMScribe: Filling ${sectionName} section with element: ${sectionElement}`);
  
  // Try multiple selectors for the section
  const sectionSelectors = [
    `[data-element="${sectionElement}"]`,
    `[data-testid="${sectionElement}"]`,
    `[id*="${sectionElement}" i]`,
    `[class*="${sectionElement}" i]`
  ];
  
  let section = null;
  
  for (const selector of sectionSelectors) {
    console.log(`EMScribe: Trying section selector: ${selector}`);
    const elements = document.querySelectorAll(selector);
    console.log(`EMScribe: Found ${elements.length} elements with selector: ${selector}`);
    
    if (elements.length > 0) {
      section = elements[0];
      console.log(`EMScribe: Found ${sectionName} section:`, section);
      break;
    }
  }
  
  if (!section) {
    console.warn(`EMScribe: ${sectionName} section not found. Scanning for similar elements...`);
    
    // Look for elements containing the section name
    const allElements = document.querySelectorAll('*');
    const possibleSections = Array.from(allElements).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      const id = el.id?.toLowerCase() || '';
      const className = el.className?.toLowerCase() || '';
      
      return text.includes(sectionName.toLowerCase()) || 
             id.includes(sectionName.toLowerCase()) || 
             className.includes(sectionName.toLowerCase());
    });
    
    console.log(`EMScribe: Found ${possibleSections.length} possible ${sectionName} sections:`, possibleSections);
    
    if (possibleSections.length === 0) {
      throw new Error(`${sectionName} section not found`);
    }
    
    section = possibleSections[0];
  }
  
  // Try to find and click the expand button
  console.log(`EMScribe: Looking for expand button in ${sectionName} section`);
  const expandSelectors = [
    '[data-element="expand-button"]',
    '[data-testid="expand-button"]',
    'button[aria-label*="expand" i]',
    'button[title*="expand" i]',
    'button:contains("Expand")',
    '.expand-button',
    '.expand-btn'
  ];
  
  let expandButton = null;
  
  for (const selector of expandSelectors) {
    const buttons = section.querySelectorAll(selector);
    if (buttons.length > 0) {
      expandButton = buttons[0];
      console.log(`EMScribe: Found expand button in ${sectionName}:`, expandButton);
      break;
    }
  }
  
  if (expandButton) {
    console.log(`EMScribe: Clicking expand button for ${sectionName}`);
    expandButton.click();
    await sleep(300); // Wait for expansion animation
  } else {
    console.log(`EMScribe: No expand button found for ${sectionName}, continuing...`);
  }
  
  // Try to find the rich text editor
  console.log(`EMScribe: Looking for rich text editor in ${sectionName} section`);
  const editorSelectors = [
    '[data-element="rich-text-editor"]',
    '[data-testid="rich-text-editor"]',
    'textarea',
    '[contenteditable="true"]',
    '.rich-text-editor',
    '.text-editor',
    'input[type="text"]'
  ];
  
  let richTextEditor = null;
  
  for (const selector of editorSelectors) {
    const editors = section.querySelectorAll(selector);
    if (editors.length > 0) {
      richTextEditor = editors[0];
      console.log(`EMScribe: Found rich text editor in ${sectionName}:`, richTextEditor);
      break;
    }
  }
  
  if (!richTextEditor) {
    console.warn(`EMScribe: Rich text editor not found in ${sectionName} section`);
    
    // List all input elements in the section
    const inputs = section.querySelectorAll('input, textarea, [contenteditable]');
    console.log(`EMScribe: Available input elements in ${sectionName}:`, inputs);
    
    if (inputs.length > 0) {
      richTextEditor = inputs[0];
      console.log(`EMScribe: Using first available input in ${sectionName}:`, richTextEditor);
    } else {
      throw new Error(`Rich text editor not found in ${sectionName} section`);
    }
  }
  
  // Clear existing content and fill with new data
  console.log(`EMScribe: Filling ${sectionName} editor with data`);
  richTextEditor.focus();
  
  // Handle different types of editors
  if (richTextEditor.contentEditable === 'true') {
    console.log(`EMScribe: ${sectionName} editor is contentEditable`);
    richTextEditor.innerHTML = '';
    richTextEditor.innerHTML = data.replace(/\n/g, '<br>');
    
    // Trigger input events
    richTextEditor.dispatchEvent(new Event('input', {bubbles: true}));
    richTextEditor.dispatchEvent(new Event('change', {bubbles: true}));
  } else {
    console.log(`EMScribe: ${sectionName} editor is regular input/textarea`);
    richTextEditor.value = '';
    await simulateTyping(richTextEditor, data);
    
    richTextEditor.dispatchEvent(new Event('input', {bubbles: true}));
    richTextEditor.dispatchEvent(new Event('change', {bubbles: true}));
  }
  
  console.log(`EMScribe: ${sectionName} section filled successfully`);
}

async function simulateTyping(element, text) {
  for (let i = 0; i < text.length; i++) {
    element.value += text[i];
    element.dispatchEvent(new Event('input', {bubbles: true}));
    if (i % 10 === 0) { // Small pause every 10 characters
      await sleep(10);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Debug function to help identify elements
function debugElements() {
  console.log('=== EMScribe Debug Info ===');
  console.log('Current URL:', window.location.href);
  console.log('Is valid encounter page:', isValidPatientEncounterPage());
  
  // Check for original expected elements
  const expectedElements = [
    'input-chief-complaint',
    'subjective-section',
    'objective-section', 
    'assessment-section',
    'plan-section',
    'expand-button',
    'rich-text-editor'
  ];
  
  console.log('=== Expected Elements ===');
  expectedElements.forEach(elementName => {
    const found = document.querySelectorAll(`[data-element="${elementName}"]`);
    console.log(`${elementName}:`, found.length > 0 ? found : 'Not found');
  });
  
  // Scan for all data-element attributes
  console.log('=== All data-element attributes ===');
  const allDataElements = document.querySelectorAll('[data-element]');
  console.log(`Found ${allDataElements.length} elements with data-element attribute:`);
  allDataElements.forEach((el, index) => {
    console.log(`${index}: data-element="${el.getAttribute('data-element')}"`, el);
  });
  
  // Scan for all data-testid attributes
  console.log('=== All data-testid attributes ===');
  const allTestIds = document.querySelectorAll('[data-testid]');
  console.log(`Found ${allTestIds.length} elements with data-testid attribute:`);
  allTestIds.forEach((el, index) => {
    console.log(`${index}: data-testid="${el.getAttribute('data-testid')}"`, el);
  });
  
  // Scan for inputs and textareas
  console.log('=== All Input Elements ===');
  const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
  console.log(`Found ${allInputs.length} input elements:`);
  allInputs.forEach((input, index) => {
    console.log(`Input ${index}:`, {
      tagName: input.tagName,
      type: input.type || 'N/A',
      name: input.name || 'N/A',
      id: input.id || 'N/A',
      placeholder: input.placeholder || 'N/A',
      className: input.className || 'N/A',
      dataElement: input.getAttribute('data-element') || 'N/A',
      dataTestId: input.getAttribute('data-testid') || 'N/A'
    });
  });
  
  // Scan for buttons that might be expand buttons
  console.log('=== All Buttons ===');
  const allButtons = document.querySelectorAll('button');
  console.log(`Found ${allButtons.length} buttons:`);
  allButtons.forEach((button, index) => {
    console.log(`Button ${index}:`, {
      textContent: button.textContent?.trim() || 'N/A',
      className: button.className || 'N/A',
      dataElement: button.getAttribute('data-element') || 'N/A',
      dataTestId: button.getAttribute('data-testid') || 'N/A',
      ariaLabel: button.getAttribute('aria-label') || 'N/A'
    });
  });
  
  // Look for elements containing SOAP keywords
  console.log('=== Elements with SOAP keywords ===');
  const soapKeywords = ['subjective', 'objective', 'assessment', 'plan', 'chief', 'complaint'];
  soapKeywords.forEach(keyword => {
    const elements = document.querySelectorAll(`*`);
    const matches = Array.from(elements).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      const id = el.id?.toLowerCase() || '';
      const className = el.className?.toLowerCase() || '';
      
      return text.includes(keyword) || id.includes(keyword) || className.includes(keyword);
    });
    
    if (matches.length > 0) {
      console.log(`Elements containing "${keyword}":`, matches.slice(0, 5)); // Show first 5
    }
  });
  
  console.log('=== Debug Complete ===');
}

// Make debug function available globally for testing
window.EMScribeDebug = debugElements;