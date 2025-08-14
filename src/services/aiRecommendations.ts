import OpenAI from 'openai';
import { BedrockService } from './bedrockService';
import { WebResearchService, CompanyIntelligence } from './webResearch';

interface CompanyContext {
  companyName: string;
  websiteUrl: string;
  email: string;
  ppa: boolean;
  genAI: boolean;
  cloudCostConcerns: boolean;
}

interface UnitMetric {
  title: string;
  description: string;
}

interface AIRecommendation {
  unitMetrics: UnitMetric[];
  conversationStarters: string[];
  conditionalInsights: {
    ppa?: string[];
    genAI?: string[];
    cloudCostConcerns?: string[];
  };
}

export class AIRecommendationService {
  private static openai: OpenAI | null = null;

  private static isValidApiKey(key: string | undefined): boolean {
    return key && key.trim() !== '' && !key.includes('your_') && key.length > 20;
  }

  private static getOpenAI(): OpenAI {
    if (!this.openai) {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!this.isValidApiKey(apiKey)) {
        throw new Error('Please configure a valid OpenAI API key in your .env.local file. Get your API key from https://platform.openai.com/api-keys');
      }
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Note: In production, you'd want to use a backend proxy
      });
    }
    return this.openai;
  }

  private static buildEnhancedPrompt(context: CompanyContext, intelligence: CompanyIntelligence, industryAnalysis: string): string {
    const { companyName, websiteUrl, ppa, genAI, cloudCostConcerns } = context;
    
    let prompt = `You are a FinOps strategy assistant with access to current company intelligence and industry analysis.

Company Information:
- Company Name: ${companyName}
- Website: ${websiteUrl || 'Not provided'}
- Industry: ${intelligence.industry}
- Business Model: ${intelligence.businessModel}
- Tech Stack: ${intelligence.techStack.join(', ')}

Recent Company Intelligence:
- Recent News: ${intelligence.recentNews.join('; ')}
- Cloud Usage Patterns: ${intelligence.cloudUsageIndicators.join('; ')}
${intelligence.stockPerformance ? `- Stock Performance: ${intelligence.stockPerformance.summary}` : ''}

Industry Analysis:
${industryAnalysis}

Focus Areas Selected:
- Private Pricing Agreement (PPA): ${ppa ? 'Yes' : 'No'}
- Generative AI: ${genAI ? 'Yes' : 'No'}
- Cloud Cost Concerns: ${cloudCostConcerns ? 'Yes' : 'No'}

Please provide a structured response with the following sections:

1. **Unit Cost Metrics (4-5 recommendations)**
   - Suggest 4-5 relevant unit cost metrics tailored to ${companyName}'s business
   - For each metric, provide a clear title and 2-3 sentence explanation that includes:
     * Why this metric matters for their specific business model
     * How it connects to business value and decision-making
     * What insights it can reveal about cost efficiency
   - Consider the company's likely industry and business model
   - Make recommendations specific and actionable

2. **FinOps Conversation Starters (3 questions)**
   - Provide 3 strategic, open-ended questions to open FinOps discussions with ${companyName}
   - Each question should be 2-3 sentences that include context about why this matters for their business
   - Focus on usage-based cost transparency, business value alignment, and strategic decision-making
   - Include specific examples or scenarios relevant to their industry and business model
   - Keep tone consultative and educational, not salesy
   - Make questions thought-provoking and discussion-worthy

3. **Conditional Insights (only if applicable)**`;

    if (ppa) {
      prompt += `
   - **PPA Discussion Starters**: 3 strategic questions about private pricing agreements and committed use optimization for ${companyName}. Each should be 2-3 sentences explaining the context and why PPAs matter for their specific situation, including potential savings scenarios and commitment strategies.`;
    }

    if (genAI) {
      prompt += `
   - **GenAI-Specific FinOps Insights**: 3 strategic questions about GPU costs, model training, and AI infrastructure optimization for ${companyName}. Each should be 2-3 sentences providing context about GenAI cost patterns, optimization opportunities, and how to align AI spending with business outcomes.`;
    }

    if (cloudCostConcerns) {
      prompt += `
   - **Cloud Cost Risk Signals**: 3 strategic questions about cost visibility, budget overruns, and cost optimization for ${companyName}. Each should be 2-3 sentences explaining common cost risk patterns, warning signs to watch for, and proactive strategies for cost management.`;
    }

    prompt += `

Please return your response as a valid JSON object with this exact structure:
{
  "unitMetrics": [
    {
      "title": "Cost per [specific unit for ${companyName}]",
      "description": "Detailed explanation of why this metric matters for their business, how it connects to business value, and what cost efficiency insights it reveals"
    }
  ],
  "conversationStarters": [
    "Strategic question 1 for ${companyName}",
    "Strategic question 2 for ${companyName}",
    "Strategic question 3 for ${companyName}"
  ],
  "conditionalInsights": {
    ${ppa ? '"ppa": ["PPA question 1", "PPA question 2", "PPA question 3"],' : ''}
    ${genAI ? '"genAI": ["GenAI question 1", "GenAI question 2", "GenAI question 3"],' : ''}
    ${cloudCostConcerns ? '"cloudCostConcerns": ["Cost concern 1", "Cost concern 2", "Cost concern 3"]' : ''}
  }
}

Make all recommendations highly specific to ${companyName} and their likely business model. Avoid generic advice.`;

    return prompt;
  }

  static async generateRecommendations(context: CompanyContext): Promise<AIRecommendation> {
    try {
      // Check if we have valid API keys, if not use fallback
      const hasValidOpenAI = this.isValidApiKey(import.meta.env.VITE_OPENAI_API_KEY);
      const hasValidAWS = this.isValidApiKey(import.meta.env.VITE_AWS_ACCESS_KEY_ID) && 
                         this.isValidApiKey(import.meta.env.VITE_AWS_SECRET_ACCESS_KEY);

      console.log('API Key Status:', {
        openAI: hasValidOpenAI ? 'Valid' : 'Invalid/Missing',
        aws: hasValidAWS ? 'Valid' : 'Invalid/Missing',
        openAIKey: import.meta.env.VITE_OPENAI_API_KEY ? `${import.meta.env.VITE_OPENAI_API_KEY.substring(0, 10)}...` : 'Not set',
        awsKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID ? `${import.meta.env.VITE_AWS_ACCESS_KEY_ID.substring(0, 10)}...` : 'Not set'
      });

      if (!hasValidOpenAI) {
        throw new Error(`OpenAI API key is invalid or missing. Please check your .env.local file. Current key: ${import.meta.env.VITE_OPENAI_API_KEY ? 'Set but invalid' : 'Not set'}`);
      }

      if (!hasValidAWS) {
        console.warn('AWS credentials invalid, proceeding with OpenAI only');
      }

      // Step 1: Gather company intelligence
      console.log('Gathering company intelligence...');
      const intelligence = await WebResearchService.gatherCompanyIntelligence(
        context.companyName, 
        context.websiteUrl
      );

      // Step 2: Use Bedrock Claude for industry analysis
      let industryAnalysis = '';
      if (hasValidAWS) {
        console.log('Analyzing with Bedrock Claude...');
        industryAnalysis = await this.getIndustryAnalysis(intelligence);
      }
      console.log('Industry analysis:', industryAnalysis);

      // Step 3: Use OpenAI GPT for final recommendations
      console.log('Generating recommendations with OpenAI...');
      const openai = this.getOpenAI();
      const prompt = this.buildEnhancedPrompt(context, intelligence, industryAnalysis);

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert FinOps consultant with deep knowledge of cloud cost optimization, unit economics, and industry-specific infrastructure patterns. You must respond with valid JSON only, no additional text or formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      console.log('OpenAI raw response:', completion.choices[0]?.message?.content);

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      let recommendations: AIRecommendation;
      try {
        // Clean the response in case there's extra formatting
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        recommendations = JSON.parse(cleanResponse) as AIRecommendation;
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw response:', response);
        throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
      }
      
      // Validate the response structure
      if (!recommendations.unitMetrics || !recommendations.conversationStarters) {
        throw new Error('Invalid response structure from AI');
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      // Re-throw the error so the user knows what went wrong
      throw error;
    }
  }

  private static getFallbackRecommendations(context: CompanyContext): AIRecommendation {
    const { companyName, ppa, genAI, cloudCostConcerns } = context;
    
    const baseRecommendations: AIRecommendation = {
      unitMetrics: [
        {
          title: `Cost per ${companyName} customer transaction`,
          description: `Monitor the total infrastructure cost for each customer transaction or core business action at ${companyName}. This metric directly connects cloud spending to revenue-generating activities, helping you understand the true cost of serving customers and identify optimization opportunities that improve profit margins. It's essential for maintaining healthy unit economics as you scale.`
        },
        {
          title: `Cost per ${companyName} service delivery`,
          description: `Track infrastructure costs associated with delivering your core product or service to customers. For ${companyName}, this means understanding how much it costs to fulfill each customer request, process each order, or deliver each unit of value. This business-focused metric helps align technical spending with customer satisfaction and operational efficiency.`
        },
        {
          title: `Cost per ${companyName} customer acquisition`,
          description: `Measure the infrastructure costs associated with onboarding and serving new customers during their first month at ${companyName}. This metric helps you understand the true cost of growth and ensures that customer acquisition costs remain sustainable. It's particularly valuable for identifying whether your platform can profitably scale with new customer growth.`
        },
        {
          title: `Cost per ${companyName} business outcome`,
          description: `Track infrastructure costs per key business result - whether that's completed orders, successful deliveries, processed payments, or other core value-creating activities for ${companyName}. This metric ensures that technology spending directly supports business objectives and helps identify which operational processes are most cost-effective to scale.`
        },
        {
          title: `Cost per ${companyName} customer success milestone`,
          description: `Monitor infrastructure costs for key customer journey milestones - from initial signup through product adoption and ongoing engagement. For ${companyName}, this helps identify which stages of the customer lifecycle are most expensive to support and where optimization efforts will have the biggest impact on customer lifetime value and retention.`
        }
      ],
      conversationStarters: [
        `How does ${companyName} ensure infrastructure costs scale proportionally with user growth and product value? Many companies find that as they scale, their cloud costs grow faster than revenue, often due to inefficient resource allocation or lack of usage-based monitoring. Understanding this relationship early helps prevent costly surprises and enables data-driven scaling decisions that align with your business model.`,
        `Are your development teams at ${companyName} empowered with cost visibility to make efficient architecture decisions? When engineers can see the cost impact of their choices in real-time, they naturally optimize for efficiency without sacrificing performance. This visibility often leads to 20-30% cost reductions through better resource selection and usage patterns, especially important as your team grows.`,
        `Would unit cost metrics help ${companyName} align engineering priorities with business profitability goals? By connecting infrastructure spending to business outcomes like customer acquisition cost or revenue per user, teams can make more strategic decisions about where to invest their optimization efforts and which features truly drive value for your specific market and customer base.`
      ],
      conditionalInsights: {}
    };

    // Add conditional insights based on selected focus areas
    if (ppa) {
      baseRecommendations.conditionalInsights.ppa = [
        `How might ${companyName} leverage committed use discounts and reserved instances to reduce baseline infrastructure costs? Understanding your predictable workload patterns can unlock significant savings through AWS Enterprise Discount Programs or similar commitment-based pricing models. This is especially valuable for companies with steady growth trajectories.`,
        `What's ${companyName}'s strategy for balancing flexibility with cost savings in your private pricing agreements? While PPAs can offer substantial discounts, they require careful capacity planning and usage forecasting. The key is identifying which workloads are predictable enough to commit to while maintaining agility for growth and experimentation.`,
        `How does ${companyName} measure and optimize the ROI of your committed cloud spending? Tracking metrics like commitment utilization rates and cost per committed unit helps ensure you're maximizing the value of your private pricing agreements. This becomes increasingly important as your infrastructure needs evolve and scale.`
      ];
    }

    if (genAI) {
      baseRecommendations.conditionalInsights.genAI = [
        `How is ${companyName} managing the unpredictable cost patterns of GPU-intensive AI workloads? GenAI applications often have highly variable compute needs, making traditional cost forecasting challenging. Understanding cost per inference, training job, or model iteration helps teams optimize both performance and spending in this rapidly evolving space.`,
        `What's ${companyName}'s approach to balancing model performance with infrastructure costs for AI features? The choice between different model sizes, inference methods, and hosting strategies can dramatically impact both user experience and cloud spending. Tracking unit costs helps teams make informed trade-offs between capability and cost-effectiveness.`,
        `How does ${companyName} optimize costs across the AI development lifecycle from experimentation to production? GenAI projects often involve significant compute costs for data processing, model training, fine-tuning, and inference. Understanding the cost structure of each phase helps teams allocate resources efficiently and identify optimization opportunities throughout the development process.`
      ];
    }

    if (cloudCostConcerns) {
      baseRecommendations.conditionalInsights.cloudCostConcerns = [
        `What early warning signals does ${companyName} monitor to prevent cloud cost overruns? Implementing automated alerts for unusual spending patterns, resource utilization thresholds, and budget variance can help teams catch cost issues before they become significant problems. This proactive approach is essential for maintaining predictable unit economics.`,
        `How does ${companyName} ensure cost visibility and accountability across different teams and projects? Without proper cost allocation and chargeback mechanisms, it's difficult to identify which initiatives are driving cloud spending and whether that spending is justified by business value. Clear cost attribution helps teams make more responsible resource decisions.`,
        `What's ${companyName}'s strategy for rightsizing resources and eliminating waste in your cloud infrastructure? Regular audits of unused resources, oversized instances, and inefficient architectures often reveal 15-25% cost reduction opportunities. The key is establishing processes to continuously optimize resource allocation as your application and usage patterns evolve.`
      ];
    }

    return baseRecommendations;
  }

  private static async getIndustryAnalysis(intelligence: CompanyIntelligence): Promise<string> {
    const prompt = `Analyze this company's industry context and provide insights for FinOps strategy:

Company: ${intelligence.companyName}
Industry: ${intelligence.industry}
Business Model: ${intelligence.businessModel}
Tech Stack: ${intelligence.techStack.join(', ')}
Recent News: ${intelligence.recentNews.join('; ')}
Cloud Usage Indicators: ${intelligence.cloudUsageIndicators.join('; ')}
${intelligence.stockPerformance ? `Stock Performance: ${intelligence.stockPerformance.summary}` : ''}

Provide a 2-3 sentence analysis of their likely cloud cost patterns, infrastructure needs, and FinOps priorities based on this context.`;

    try {
      return await BedrockService.invokeClaude(prompt);
    } catch (error) {
      console.warn('Bedrock analysis failed, using fallback:', error);
      return `Based on ${intelligence.companyName}'s ${intelligence.industry} industry focus and ${intelligence.businessModel} business model, they likely have significant cloud infrastructure needs with potential for cost optimization through unit economics and usage-based monitoring.`;
    }
  }
}