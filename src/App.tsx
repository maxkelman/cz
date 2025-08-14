import React, { useState } from 'react';
import { Building2, Globe, Mail, DollarSign, Bot, AlertTriangle, Shield, TrendingUp, MessageCircle, ArrowRight, Loader2, X } from 'lucide-react';
import { AIRecommendationService } from './services/aiRecommendations';

// Utility function to validate company name and URL match
function validateCompanyUrlMatch(companyName: string, websiteUrl: string): boolean {
  if (!companyName.trim() || !websiteUrl.trim()) {
    return true; // Skip validation if either is empty
  }

  // Clean and normalize inputs
  const cleanCompanyName = companyName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .replace(/(inc|corp|corporation|llc|ltd|limited|company|co)$/g, ''); // Remove common suffixes

  const cleanUrl = websiteUrl.toLowerCase()
    .replace(/^https?:\/\//g, '') // Remove protocol
    .replace(/^www\./g, '') // Remove www
    .split('.')[0] // Get domain name part only
    .replace(/[^a-z0-9]/g, ''); // Remove special characters

  // Check for exact match
  if (cleanCompanyName === cleanUrl) {
    return true;
  }

  // Check if company name contains URL or vice versa (for partial matches)
  if (cleanCompanyName.length >= 3 && cleanUrl.length >= 3) {
    if (cleanCompanyName.includes(cleanUrl) || cleanUrl.includes(cleanCompanyName)) {
      return true;
    }
  }

  // Check for common abbreviations/variations
  const companyWords = companyName.toLowerCase().split(/\s+/);
  const urlParts = cleanUrl;
  
  // Check if URL contains any significant word from company name
  for (const word of companyWords) {
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    if (cleanWord.length >= 3 && urlParts.includes(cleanWord)) {
      return true;
    }
  }

  // Check for acronyms (first letters of company name words)
  if (companyWords.length > 1) {
    const acronym = companyWords
      .filter(word => word.length > 0)
      .map(word => word[0])
      .join('');
    if (acronym.length >= 2 && urlParts.includes(acronym)) {
      return true;
    }
  }

  return false; // No match found
}

interface FormData {
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

function App() {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    websiteUrl: '',
    email: '',
    ppa: false,
    genAI: false,
    cloudCostConcerns: false,
  });

  const [recommendations, setRecommendations] = useState<AIRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear validation warning when user starts typing
    if (validationWarning) {
      setValidationWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.websiteUrl.trim()) {
      setErrorMessage('Please enter both a company name and website URL to continue.');
      setShowErrorModal(true);
      return;
    }
    
    // Validate company name and URL match
    if (formData.websiteUrl.trim() && !validateCompanyUrlMatch(formData.companyName, formData.websiteUrl)) {
      setValidationWarning(`The company name "${formData.companyName}" doesn't seem to match the website URL "${formData.websiteUrl}". This might lead to inaccurate recommendations.`);
      return;
    }
    
    setValidationWarning(null);
    setIsGenerating(true);
    try {
      const recs = await AIRecommendationService.generateRecommendations(formData);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('API key')) {
        setErrorMessage('API configuration error: ' + errorMessage + '\n\nPlease check your .env.local file and ensure your OpenAI API key is valid.');
      } else {
        setErrorMessage('Error generating recommendations: ' + errorMessage);
      }
      setShowErrorModal(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setFormData({
      companyName: '',
      websiteUrl: '',
      email: '',
      ppa: false,
      genAI: false,
      cloudCostConcerns: false,
    });
    setRecommendations(null);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="bg-brand-gray-100 rounded-2xl p-12 max-w-md w-full">
          <div className="text-center">
            <div className="bg-brand-orange/20 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Researching & Analyzing</h2>
            <p className="text-brand-gray-300 mb-4">
              Gathering company intelligence, analyzing industry trends, and generating personalized FinOps recommendations for {formData.companyName}...
            </p>
            <div className="text-sm text-brand-gray-400 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-brand-teal rounded-full animate-pulse"></div>
                <span>Researching company background</span>
                <div className="w-2 h-2 bg-brand-teal rounded-full animate-pulse"></div>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-brand-orange rounded-full animate-pulse"></div>
                <span>Analyzing industry context with AWS Bedrock</span>
                <div className="w-2 h-2 bg-brand-orange rounded-full animate-pulse"></div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-brand-beige rounded-full animate-pulse"></div>
                <span>Generating recommendations with CloudZero</span>
                <div className="w-2 h-2 bg-brand-beige rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations) {
    return (
      <div className="min-h-screen bg-brand-black">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-brand-gray-100 rounded-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-brand-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-brand-orange mb-2">CloudZero</h1>
                  <h2 className="text-xl font-semibold text-brand-teal mb-2">FinOps Strategy Report</h2>
                  <p className="text-brand-gray-300">Customized recommendations for {formData.companyName}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2 font-medium"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  New Analysis
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Unit Cost Metrics */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-6 h-6 text-brand-orange" />
                  <h2 className="text-2xl font-semibold text-white">Recommended Unit Cost Metrics</h2>
                </div>
                <div className="grid gap-4">
                  {recommendations.unitMetrics.map((metric, index) => (
                    <div key={index} className="bg-brand-gray-200 rounded-xl p-6 border border-brand-gray-300">
                      <h3 className="text-lg font-semibold text-brand-orange mb-2">{metric.title}</h3>
                      <p className="text-white leading-relaxed">{metric.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Conversation Starters */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <MessageCircle className="w-6 h-6 text-brand-teal" />
                  <h2 className="text-2xl font-semibold text-white">FinOps Conversation Starters</h2>
                </div>
                <div className="grid gap-4">
                  {recommendations.conversationStarters.map((starter, index) => (
                    <div key={index} className="bg-brand-gray-200 rounded-xl p-6 border border-brand-gray-300">
                      <div className="flex gap-4 items-start">
                        <div className="bg-brand-teal text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mt-1 flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-white leading-relaxed">{starter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Conditional Insights */}
              {(recommendations.conditionalInsights.ppa || recommendations.conditionalInsights.genAI || recommendations.conditionalInsights.cloudCostConcerns) && (
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-6">Specialized Insights</h2>
                  
                  {recommendations.conditionalInsights.ppa && (
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-brand-teal" />
                        <h3 className="text-xl font-semibold text-brand-teal">Private Pricing Agreement (PPA)</h3>
                      </div>
                      <div className="bg-brand-gray-200 rounded-xl p-6 border border-brand-teal/30">
                        <p className="font-medium text-white mb-3">PPA Discussion Starters</p>
                        <ul className="space-y-2">
                          {recommendations.conditionalInsights.ppa.map((insight, index) => (
                            <li key={index} className="text-white flex gap-2">
                              <span className="text-brand-teal">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {recommendations.conditionalInsights.genAI && (
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <Bot className="w-5 h-5 text-brand-orange" />
                        <h3 className="text-xl font-semibold text-brand-orange">Generative AI</h3>
                      </div>
                      <div className="bg-brand-gray-200 rounded-xl p-6 border border-brand-orange/30">
                        <p className="font-medium text-white mb-3">GenAI-Specific FinOps Insights</p>
                        <ul className="space-y-2">
                          {recommendations.conditionalInsights.genAI.map((insight, index) => (
                            <li key={index} className="text-white flex gap-2">
                              <span className="text-brand-orange">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {recommendations.conditionalInsights.cloudCostConcerns && (
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-brand-gray-300" />
                        <h3 className="text-xl font-semibold text-brand-gray-300">Cloud Cost Concerns</h3>
                      </div>
                      <div className="bg-brand-gray-200 rounded-xl p-6 border border-brand-gray-300">
                        <p className="font-medium text-white mb-3">Cloud Cost Risk Signals</p>
                        <ul className="space-y-2">
                          {recommendations.conditionalInsights.cloudCostConcerns.map((insight, index) => (
                            <li key={index} className="text-white flex gap-2">
                              <span className="text-brand-gray-300">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Email Follow-up */}
              {formData.email && (
                <section>
                  <div className="bg-brand-gray-200 rounded-xl p-6 border border-brand-gray-300">
                    <div className="flex items-center gap-3 mb-3">
                      <Mail className="w-5 h-5 text-brand-orange" />
                      <h3 className="text-lg font-semibold text-white">Next Steps</h3>
                    </div>
                    <p className="text-brand-gray-300">
                      Thanks! We'll follow up with more information and a CloudZero demo link at{' '}
                      <span className="font-semibold text-brand-orange">{formData.email}</span>.
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Custom Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
            <div className="bg-brand-gray-100 rounded-2xl p-8 max-w-md w-full border border-brand-gray-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-orange/20 p-2 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-brand-orange" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Oops!</h3>
                </div>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="text-brand-gray-300 hover:text-white transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-brand-gray-300 mb-6 leading-relaxed">
                {errorMessage}
              </p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-brand-orange mb-4">CloudZero</h1>
          <h2 className="text-3xl font-semibold text-brand-teal mb-6">FinOps Quick Start</h2>
          <p className="text-brand-gray-300 text-lg leading-relaxed max-w-3xl mx-auto">
            Let CloudZero help you get the FinOps conversation started with your customer! Enter in your customer details, and we'll help you determine some Unit Costs and FinOps conversations starters to quickly help your customer better understand their cloud costs!
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-brand-gray-100 rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-white mb-2">Company Details</h3>
              <p className="text-brand-gray-300">Enter a company's details to generate an analysis.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-white font-medium mb-3">
                  Company Name (Required)
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-brand-gray-200 border border-brand-gray-300 rounded-lg text-white placeholder-brand-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition-colors duration-200"
                  placeholder="e.g., CloudZero"
                />
              </div>

              {/* Website URL */}
              <div>
                <label htmlFor="websiteUrl" className="block text-white font-medium mb-3">
                  Website URL (Required)
                </label>
                <input
                  type="text"
                  id="websiteUrl"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-brand-gray-200 border border-brand-gray-300 rounded-lg text-white placeholder-brand-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition-colors duration-200"
                  placeholder="https://www.cloudzero.com"
                />
                {validationWarning && (
                  <div className="mt-3 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-200 font-medium mb-1">Potential Mismatch Detected</p>
                        <p className="text-yellow-300 text-sm leading-relaxed">
                          {validationWarning}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-white font-medium mb-3">
                  Your Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-brand-gray-200 border border-brand-gray-300 rounded-lg text-white placeholder-brand-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition-colors duration-200"
                  placeholder="For a follow-up with more details"
                />
              </div>

              {/* Focus Areas */}
              <div>
                <h4 className="text-white font-medium mb-4">Focus Areas (optional)</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 bg-brand-gray-200 rounded-lg hover:bg-brand-gray-200/80 cursor-pointer transition-colors duration-200">
                    <input
                      type="checkbox"
                      name="ppa"
                      checked={formData.ppa}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-brand-orange bg-brand-gray-300 border-brand-gray-300 rounded focus:ring-brand-orange focus:ring-2"
                    />
                    <Shield className="w-5 h-5 text-brand-teal flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">Private Pricing Agreement (PPA)</div>
                      <div className="text-sm text-brand-gray-300">Enterprise discounts and committed use optimization</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-brand-gray-200 rounded-lg hover:bg-brand-gray-200/80 cursor-pointer transition-colors duration-200">
                    <input
                      type="checkbox"
                      name="genAI"
                      checked={formData.genAI}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-brand-orange bg-brand-gray-300 border-brand-gray-300 rounded focus:ring-brand-orange focus:ring-2"
                    />
                    <Bot className="w-5 h-5 text-brand-orange flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">Generative AI</div>
                      <div className="text-sm text-brand-gray-300">GPU costs, model training, and inference optimization</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-brand-gray-200 rounded-lg hover:bg-brand-gray-200/80 cursor-pointer transition-colors duration-200">
                    <input
                      type="checkbox"
                      name="cloudCostConcerns"
                      checked={formData.cloudCostConcerns}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-brand-orange bg-brand-gray-300 border-brand-gray-300 rounded focus:ring-brand-orange focus:ring-2"
                    />
                    <AlertTriangle className="w-5 h-5 text-brand-gray-300 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">Cloud Cost Concerns</div>
                      <div className="text-sm text-brand-gray-300">Rising costs, budget overruns, and cost visibility issues</div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-brand-orange hover:bg-brand-orange/90 disabled:bg-brand-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Analysis...
                  </>
                ) : (
                  'Get Analysis'
                )}
              </button>

              {/* Proceed Anyway Button */}
              {validationWarning && (
                <button
                  type="button"
                  onClick={() => setValidationWarning(null)}
                  className="w-full bg-brand-gray-300 hover:bg-brand-gray-200 text-brand-black font-semibold py-3 px-6 rounded-lg transition-all duration-200 mt-3"
                >
                  Proceed Anyway
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;