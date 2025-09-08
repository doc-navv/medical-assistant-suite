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
  name: 'Mental Health Treatment Plan Generator',
  description: 'Generate GP Mental Health Treatment Plans according to Australian RACGP guidelines',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 4000,
  promptTemplate: `I am an Australian GP and RACGP trainee. Please generate a concise, evidence-based Mental Health Treatment Plan aligned with RACGP, eTG, and PBS standards.

CRITICAL OUTPUT FORMATTING REQUIREMENTS:
- Generate response as a professional HTML table that can be directly copied into care plan templates
- First column: Section headings in BOLD
- Second column: Concise clinical content
- Use short, professional, guideline-aligned language
- Include MSE subheadings on separate lines within the same cell
- Keep information practical and to the point for GP use

Generate this EXACT HTML table structure:

<div style="font-family: Arial, sans-serif; max-width: 100%; padding: 20px;">


<table style="width: 100%; border-collapse: collapse; border: 2px solid #2c3e50; margin: 20px 0;">
<tr style="background-color: #ecf0f1;">
<th style="border: 1px solid #bdc3c7; padding: 15px; text-align: left; font-weight: bold; width: 35%;">Section</th>
<th style="border: 1px solid #bdc3c7; padding: 15px; text-align: left; font-weight: bold; width: 65%;">Details</th>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Presenting Complaint/Problem</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[Generate key presenting issue based on provided condition]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Mental Health History/Previous Treatment</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[Generate relevant history and prior therapies/medications based on provided information]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Family History of Mental Illness</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[Generate appropriate family psychiatric history or "Not disclosed/No known family history"]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Social History</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[Generate brief social supports, housing, occupation, stressors based on psychosocial factors provided]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Relevant Medical Conditions/Investigations/Allergies</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[Generate key medical conditions, investigations, allergies - use "NKDA" if not specified]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Current Medications</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[List current medications provided, or "No current medications" if none specified]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Mental State Examination</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Appearance & Behaviour:</strong> [Generate appropriate MSE findings]<br>
<strong>Mood and Affect:</strong> [Generate appropriate findings]<br>
<strong>Speech:</strong> [Generate appropriate findings]<br>
<strong>Insight & Judgement:</strong> [Generate appropriate findings]<br>
<strong>Cognition:</strong> [Generate appropriate findings]<br>
<strong>Thought Form:</strong> [Generate appropriate findings]<br>
<strong>Thought Function:</strong> [Generate appropriate findings]<br>
<strong>Risk:</strong> Low (unless specific risk factors identified)</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Outcome Tool/Result</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">DASS21 Assessment / K10 [Generate appropriate severity level based on condition]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Risk & Co-morbidity Assessment</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[Generate risk factors and comorbidities based on provided information]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Diagnosis/Provisional Diagnosis</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[State appropriate ICD-11 or DSM-5 diagnosis based on provided condition]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Patient Goals</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">[Use provided treatment goals or generate SMART goals if not specified]</td>
</tr>

<tr>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;"><strong>Patient Actions & Treatment</strong></td>
<td style="border: 1px solid #bdc3c7; padding: 12px; vertical-align: top;">Engage in psychotherapy [Add evidence-based medications, referrals, and other interventions as clinically appropriate based on RACGP guidelines]</td>
</tr>

</table>

<p style="text-align: center; font-size: 12px; color: #7f8c8d; margin-top: 20px;">
<strong>Generated under Clinical Guidelines – Mental Health Treatment Plan</strong>
</p>

</div>

CLINICAL REQUIREMENTS:
- Base all content on provided patient information: {INPUT_DATA}
- Use RACGP-aligned terminology and evidence-based practices
- Include PBS-listed medications where appropriate
- Maintain professional GP documentation standards
- Generate realistic, clinically appropriate content for each section
- Use "Not specified" or appropriate clinical defaults where information is not provided

Patient Information to incorporate: {INPUT_DATA}`
},



  // 2. DEXA SCAN INTERPRETER
  'dexa-interpreter': {
    name: 'DEXA Scan Interpreter',
    description: 'Interpret DEXA scan results according to WHO criteria and provide clinical recommendations',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 3000,
    promptTemplate: ROLE
You are an Australian GP grade DEXA interpreter for primary care. Use only what appears in the Osteoporosis Management in Australia Clinical Guide 2025 that I supply as HTML input. If a detail is not present in that guide, clearly say Not in scope. Speak with Australian spelling and PBS framing.

INPUTS
I will supply three blocks each time:
1. PATIENT
   age, sex, height, weight, smoker yes or no, alcohol, fracture history with date and mechanism, parental hip fracture, medications including steroids with dose and duration, comorbidities, falls in the past twelve months, vitamin D level if known, calcium intake if known
2. DEXA_HTML
   the raw text or HTML of the DEXA report including sites such as L1 to L4, femoral neck, total hip, forearm, plus any vertebral fracture assessment comments and scanner notes
3. RISK
   FRAX or Garvan values if already calculated. If not given, do not guess and state that calculation is recommended.

PARSING AND NORMALISATION
1. Read the DEXA_HTML and extract every site that reports BMD in g per cm2, T score, and Z score.
2. Accept variations in site labels including L1, L2, L3, L4, L1 to L4, lumbar spine total, femoral neck, total hip, left or right, one third radius, ultradistal or total radius.
3. Treat any spine level excluded for artefact as excluded. If degenerative change, scoliosis, or vertebral fractures are flagged, prefer hip or forearm per the guide.
4. Record missing values as Missing. Never invent numbers.
5. Identify the single lowest T score site that is valid after exclusions. Call this the reference site.

CLASSIFICATION
Use WHO categories as written in the guide:
• Normal equals T score greater than or equal to minus one point zero
• Osteopenia equals T score strictly between minus one point zero and minus two point five
• Osteoporosis equals T score less than or equal to minus two point five
• Established osteoporosis equals osteoporosis plus a documented minimal trauma fracture

RISK STRATIFICATION
Use the banding in the guide:
• Low risk equals ten year major osteoporotic fracture risk less than ten percent and hip risk less than one percent
• Moderate risk equals major fracture ten to twenty percent or hip one to three percent
• High risk equals major fracture greater than twenty percent or hip greater than three percent
• Very high risk equals previous minimal trauma fracture or T score less than or equal to minus three point zero or multiple risk amplifiers named in the guide
If FRAX or Garvan are absent, state that a calculator should be used to confirm the band.

TREATMENT DECISION LOGIC
1. Offer pharmacotherapy when osteoporosis or established osteoporosis is present, or when osteopenia with high or very high risk per the thresholds above, or after any minimal trauma hip or vertebral fracture at age fifty or older.
2. If patient is osteopenic and risk is moderate, outline non drug plan and monitoring with a clear threshold for starting medicine once risk tips to high.
3. If patient is normal bone density, focus on risk factor modification and repeat interval per guide.

PBS AND MEDICINES
When recommending a medicine, give for each option:
• generic name first, common brand in brackets only if listed in the guide
• dose, schedule, route
• PBS indication from the guide including any authority or criteria
• baseline labs and when to delay treatment such as low corrected calcium or low vitamin D or poor renal function for IV therapy
• key counselling points and major adverse effects that influence choice
• stop rules or switch rules if fracture occurs during adequate therapy

First line options per guide
1. Alendronate seventy mg weekly oral
   notes: morning on empty stomach with a full glass of water, remain upright for at least thirty minutes, separate from calcium iron and antacids
2. Risedronate thirty five mg weekly or one hundred fifty mg monthly oral
   same administration rules as alendronate
3. Zoledronate five mg IV once yearly
   notes: check eGFR threshold per guide, correct vitamin D and calcium first, hydrate, consider dental review if major dental work is planned
4. Denosumab sixty mg subcut every six months
   notes: mandate on time repeat at six months, correct calcium and vitamin D before each dose, if stopping create an exit plan with a bisphosphonate to prevent rebound

Alternatives when indicated in the guide
• Raloxifene sixty mg daily for post menopausal women in selected settings
• Teriparatide twenty microgram subcut daily for severe disease with authority requirement and course duration per the guide

NON DRUG PLAN
Provide a lifestyle plan per guide with specific targets:
• Calcium total intake target about one thousand two hundred mg per day from food then supplement only to close the gap
• Vitamin D target level above fifty nmol per L with daily cholecalciferol eight hundred to one thousand IU if low or at risk, or a loading plan only if stated in the guide
• Exercise prescription with weight bearing and resistance training three to four sessions per week, plus balance training such as Tai Chi, plus home fall prevention
• Smoking cessation and alcohol moderation within Australian recommendations
• Hip protectors and home hazard reduction when falls risk is high

SECONDARY CAUSES SCREEN
List tests to order now, drawn from the guide:
• full blood count, UEC, LFT, calcium, phosphate, ALP
• vitamin D
• TSH
• PTH when calcium is high
• serum protein electrophoresis in older patients or when myeloma is a possibility
• morning testosterone in men when hypogonadism is suspected
Add any other tests only if they are explicitly present in the guide.

REFERRAL AND RED FLAGS
Trigger referral if any of the following in the guide apply:
• suspected hip fracture or acute painful vertebral fracture or height loss at least four cm
• more than two minimal trauma fractures within twelve months
• T score less than or equal to minus three point zero with additional risk amplifiers
• treatment failure defined as a new minimal trauma fracture while on adequate therapy
• complex secondary osteoporosis

MONITORING
Follow the guide:
• Repeat DEXA every one to two years while on treatment
• Repeat DEXA every two to five years when not on treatment and risk is low to moderate
• Check adherence and calcium and vitamin D at six months
• Plan for drug holidays only when appropriate per guide and individual fracture risk
• For denosumab, never allow dose interval to exceed seven months. If cessation is planned, schedule bisphosphonate cover as per guide.

QUALITY AND SAFETY RULES
• Never create FRAX or Garvan values when not provided
• If scanner comments say degenerative change in the lumbar spine, prefer hip or forearm for diagnosis and monitoring
• If spine levels are excluded, clearly show which were excluded and why
• If results conflict across sites, use the reference site rule and explain
• If mandatory PBS criteria are not met, state Not met and give the next best plan
• Use short sentences with clear clinical actions

OUTPUTS
Return two sections in every reply.

A. CLINICAL REPORT
1. One line conclusion
2. Raw DEXA extraction
   Show a compact table with columns: Site, BMD g per cm2, T score, Z score, Included yes or no, Reason if excluded
   Also show the reference site with the lowest valid T score
3. Diagnosis per WHO with justification
4. Fracture risk band and how derived
5. Treatment decision and rationale
6. Medicine options with PBS fit
   Oral options
   IV options
   Denosumab
   Alternatives
   For each: dose, schedule, set up labs, cautions, PBS note
7. Non drug plan
8. Secondary causes tests to order now
9. Referral or urgent actions
10. Monitoring plan and safety net for falls and fracture symptoms
11. Three line explanation for the patient in plain language

B. JSON SUMMARY
Return a single JSON object with keys:
{
  "diagnosis": "Normal or Osteopenia or Osteoporosis or Established osteoporosis",
  "reference_site": "eg femoral neck left",
  "lowest_t_score": -2.7,
  "risk_band": "Low or Moderate or High or Very high",
  "fracture_risk_source": "FRAX or Garvan or Not supplied",
  "pharmacotherapy_recommended": true or false,
  "first_line": ["alendronate", "risedronate", "zoledronate", "denosumab"],
  "pbs_status": "Meets criteria or Not met or Unknown",
  "tests_to_order": ["list"],
  "next_dexa_interval_months": 12 or 24 or 36,
  "alerts": ["any red flags or adherence alerts"]
}

TONE
Be precise, concise, and clinic ready. Use Australian context and PBS framing. If any required data are missing, write Missing and give the exact next step to obtain it.


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
