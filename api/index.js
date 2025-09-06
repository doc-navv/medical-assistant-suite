export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'Medical Assistant Suite API is running!', 
      timestamp: new Date().toISOString(),
      availableTools: Object.keys(TOOL_CONFIGURATIONS),
      version: '1.0.0'
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { toolType, inputData } = req.body || {};
    
    if (!toolType || !inputData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tool type and input data are required' 
      });
    }
    
    // Check if tool exists
    if (!TOOL_CONFIGURATIONS[toolType]) {
      return res.status(400).json({
        success: false,
        error: `Unknown tool type: ${toolType}. Available tools: ${Object.keys(TOOL_CONFIGURATIONS).join(', ')}`
      });
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      });
    }
    
    // Get the tool configuration and generate prompt
    const toolConfig = TOOL_CONFIGURATIONS[toolType];
    const prompt = generatePrompt(toolConfig, inputData);
    
    console.log(`Processing ${toolType} request`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: toolConfig.model || 'gpt-4o-mini',
        messages: [{ 
          role: 'user', 
          content: prompt 
        }],
        temperature: toolConfig.temperature || 0.3,
        max_tokens: toolConfig.maxTokens || 4000,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API error');
    }
    
    const data = await response.json();
    
    return res.status(200).json({
      success: true,
      result: data.choices[0].message.content,
      toolType: toolType,
      toolName: toolConfig.name,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Failed to process ${toolType || 'unknown'} request: ${error.message}` 
    });
  }
}

// ============================================
// TOOL CONFIGURATIONS - ADD NEW TOOLS HERE
// ============================================

const TOOL_CONFIGURATIONS = {
  
  // 1. MENTAL HEALTH CARE PLAN
  'mental-health': {
    name: 'Mental Health Care Plan Generator',
    description: 'Generate GP Mental Health Treatment Plans according to Australian MBS guidelines',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 4000,
    promptTemplate: `Act as an experienced Australian General Practitioner creating a GP Mental Health Treatment Plan under the current MBS guidelines (effective from July 1, 2025).

Generate the response in this EXACT format:

<div style="font-family: Arial, sans-serif; max-width: 100%; padding: 20px;">

<h2 style="text-align: center; color: #2c3e50; margin-bottom: 5px;">GP Mental Health Treatment Plan – {DATE}</h2>

<p style="text-align: center; color: #7f8c8d; margin-bottom: 30px; font-size: 14px;">Generated under MBS Guidelines effective July 1, 2025</p>

<h3 style="color: #2980b9; margin-bottom: 15px;">📋 Patient Assessment & Diagnosis</h3>

<table style="width: 100%; border-collapse: collapse; border: 2px solid #34495e; margin-bottom: 30px;">
<tr style="background-color: #ecf0f1;">
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Mental Health Condition</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Severity & Risk Assessment</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Contributing Factors</td>
</tr>
<tr>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Primary mental health diagnosis based on provided condition]</td>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Severity level and risk factors assessment]</td>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Biological, psychological, social factors from provided information]</td>
</tr>
</table>

<h3 style="color: #2980b9; margin-bottom: 15px;">📋 Treatment Goals & Interventions</h3>

<table style="width: 100%; border-collapse: collapse; border: 2px solid #34495e; margin-bottom: 30px;">
<tr style="background-color: #ecf0f1;">
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Treatment Goals</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Interventions & Strategies</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Review & Monitoring</td>
</tr>
<tr>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[SMART mental health goals based on provided goals]</td>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[GP interventions, referrals, medication considerations based on current medications]</td>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Follow-up schedule, outcome measures, monitoring plan]</td>
</tr>
</table>

</div>

Patient Information: {INPUT_DATA}`
  },

  // 2. DEXA SCAN INTERPRETER
  'dexa-interpreter': {
    name: 'DEXA Scan Interpreter',
    description: 'Interpret DEXA scan results according to WHO criteria and provide clinical recommendations',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 3000,
    promptTemplate: `Act as an experienced radiologist and endocrinologist interpreting DEXA scan results according to WHO criteria and Australian clinical guidelines.

Generate a comprehensive DEXA scan interpretation report:

<div style="font-family: Arial, sans-serif; max-width: 100%; padding: 20px;">

<h2 style="text-align: center; color: #2c3e50; margin-bottom: 5px;">DEXA Scan Interpretation Report – {DATE}</h2>

<h3 style="color: #2980b9; margin-bottom: 15px;">📋 Bone Density Results</h3>

<table style="width: 100%; border-collapse: collapse; border: 2px solid #34495e; margin-bottom: 30px;">
<tr style="background-color: #ecf0f1;">
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Anatomical Site</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">BMD (g/cm²)</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">T-Score</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Z-Score</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">WHO Classification</td>
</tr>
[Analyze each anatomical site from the provided data and create table rows with proper WHO classification]
</table>

<h3 style="color: #2980b9; margin-bottom: 15px;">📋 Clinical Interpretation & Recommendations</h3>

<table style="width: 100%; border-collapse: collapse; border: 2px solid #34495e;">
<tr style="background-color: #ecf0f1;">
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Primary Diagnosis</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Fracture Risk Assessment</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Management Recommendations</td>
</tr>
<tr>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Primary bone health diagnosis based on worst T-score]</td>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[10-year fracture risk assessment using clinical factors]</td>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Specific treatment recommendations, lifestyle modifications, follow-up timeline]</td>
</tr>
</table>

</div>

WHO Classification Criteria:
- T-score ≥ -1.0: Normal bone density
- T-score -1.0 to -2.5: Osteopenia (low bone mass)  
- T-score ≤ -2.5: Osteoporosis
- Z-score < -2.0: Below expected range for age

DEXA Scan Data to Interpret: {INPUT_DATA}`
  },

  // 3. SPIROMETRY INTERPRETER
  'spirometry-interpreter': {
    name: 'Spirometry Interpreter',
    description: 'Interpret spirometry results according to ATS/ERS guidelines',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 3000,
    promptTemplate: `Act as an experienced respiratory physician interpreting spirometry results according to ATS/ERS guidelines and Australian respiratory medicine standards.

Generate a comprehensive spirometry interpretation report:

<div style="font-family: Arial, sans-serif; max-width: 100%; padding: 20px;">

<h2 style="text-align: center; color: #2c3e50; margin-bottom: 5px;">Spirometry Interpretation Report – {DATE}</h2>

<h3 style="color: #2980b9; margin-bottom: 15px;">📋 Spirometry Results Summary</h3>

<table style="width: 100%; border-collapse: collapse; border: 2px solid #34495e; margin-bottom: 30px;">
<tr style="background-color: #ecf0f1;">
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Parameter</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Measured Value</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Predicted Value</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">% Predicted</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Interpretation</td>
</tr>
[Create rows for FEV1, FVC, FEV1/FVC ratio with detailed interpretations based on provided data]
</table>

<h3 style="color: #2980b9; margin-bottom: 15px;">📋 Clinical Interpretation & Recommendations</h3>

<table style="width: 100%; border-collapse: collapse; border: 2px solid #34495e;">
<tr style="background-color: #ecf0f1;">
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Lung Function Pattern</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Severity Assessment</td>
<td style="border: 1px solid #bdc3c7; padding: 12px; font-weight: bold;">Clinical Recommendations</td>
</tr>
<tr>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Normal/Obstructive/Restrictive/Mixed pattern with rationale]</td>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Mild/Moderate/Severe classification with supporting values]</td>
<td style="border: 1px solid #bdc3c7; padding: 10px; vertical-align: top;">[Further investigations, treatment considerations, follow-up recommendations]</td>
</tr>
</table>

</div>

Interpretation Guidelines:
- Normal spirometry: FEV1/FVC > 0.70, FEV1 and FVC > 80% predicted
- Obstructive pattern: FEV1/FVC < 0.70 (< 0.65 in elderly)
- Restrictive pattern: FEV1/FVC ≥ 0.70 but FVC < 80% predicted
- Mixed pattern: Both obstructive and restrictive features

Severity Classification (for obstructive):
- Mild: FEV1 ≥ 80% predicted
- Moderate: FEV1 50-79% predicted  
- Severe: FEV1 30-49% predicted
- Very severe: FEV1 < 30% predicted

Spirometry Data to Interpret: {INPUT_DATA}`
  },

  // ============================================
  // ADD YOUR NEW TOOLS HERE - TEMPLATE:
  // ============================================
  
  /*
  'your-new-tool': {
    name: 'Your Tool Name',
    description: 'Description of what your tool does',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 4000,
    promptTemplate: `Your custom prompt here.
    
    Use {DATE} for current date and {INPUT_DATA} for user input.
    
    Your prompt content: {INPUT_DATA}`
  },
  */

};

// ============================================
// PROMPT GENERATION FUNCTION
// ============================================

function generatePrompt(toolConfig, inputData) {
  const currentDate = new Date().toLocaleDateString('en-AU', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  
  let prompt = toolConfig.promptTemplate;
  
  // Replace placeholders
  prompt = prompt.replace(/{DATE}/g, currentDate);
  prompt = prompt.replace(/{INPUT_DATA}/g, JSON.stringify(inputData, null, 2));
  
  return prompt;
}

// ============================================
// HOW TO ADD NEW TOOLS:
// ============================================
/*

1. Copy the template tool configuration above
2. Replace 'your-new-tool' with your tool identifier (lowercase, use hyphens)
3. Update the name, description, and model settings
4. Write your custom prompt in promptTemplate
5. Use {DATE} for current date and {INPUT_DATA} for user input
6. Save and redeploy to Vercel

Example for ECG Interpreter:

'ecg-interpreter': {
  name: 'ECG Interpreter',
  description: 'Interpret ECG findings and provide clinical assessment',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 3000,
  promptTemplate: `Act as an experienced cardiologist interpreting ECG results.
  
  Generate ECG interpretation report for: {INPUT_DATA}
  
  Date: {DATE}`
},

*/
